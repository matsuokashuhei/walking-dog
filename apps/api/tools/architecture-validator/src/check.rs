use std::error::Error;
use std::fmt::{self, Display, Formatter};
use std::fs;
use std::path::{Path, PathBuf};

use cargo_metadata::MetadataCommand;
use chrono::Utc;
use serde_json::json;

use crate::ast::{Diagnostic, SourceUnit, analyze_source};
use crate::exceptions::{ExceptionSet, validate_exceptions};
use crate::intent::{IntentDiff, IntentManifest, validate_intents};
use crate::policy::{Policy, validate_metadata};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OutputFormat {
    Human,
    Sarif,
}

#[derive(Debug)]
pub struct CheckError(String);

impl Display for CheckError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl Error for CheckError {}

/// Discovers and validates every Rust source below the API workspace.
///
/// With `validate_repository` enabled, this also validates locked Cargo metadata,
/// exact exceptions, and all checked-in change intents.
///
/// # Errors
///
/// Fails closed for I/O, parse, metadata, policy, exception, and intent errors.
pub fn check_workspace(
    root: &Path,
    validate_repository: bool,
) -> Result<Vec<Diagnostic>, CheckError> {
    let mut sources = Vec::new();
    discover_rust(root, root, &mut sources)?;
    let mut diagnostics = Vec::new();
    for path in sources {
        let relative = path.strip_prefix(root).map_err(error)?.to_string_lossy();
        let crate_name = crate_name(&relative).ok_or_else(|| {
            CheckError(format!(
                "unknown Rust source outside a workspace crate: {relative}"
            ))
        })?;
        let source = fs::read_to_string(&path).map_err(error)?;
        let source_diagnostics = analyze_source(SourceUnit {
            crate_name,
            path: &relative,
            source: &source,
            production: !is_non_production(&relative),
        })
        .map_err(error)?;
        if relative.starts_with("crates/") && !is_non_production(&relative) {
            diagnostics.extend(source_diagnostics);
        }
    }
    if validate_repository {
        validate_repository_files(root, &diagnostics)?;
    }
    Ok(diagnostics)
}

fn validate_repository_files(root: &Path, diagnostics: &[Diagnostic]) -> Result<(), CheckError> {
    let policy = Policy::parse(
        &fs::read_to_string(root.join("architecture/dependency-policy.toml")).map_err(error)?,
    )
    .map_err(error)?;
    let metadata = MetadataCommand::new()
        .current_dir(root)
        .manifest_path(root.join("Cargo.toml"))
        .other_options(vec!["--locked".to_owned(), "--all-features".to_owned()])
        .exec()
        .map_err(error)?;
    let edge_diagnostics = validate_metadata(&policy, &metadata).map_err(error)?;
    if !edge_diagnostics.is_empty() {
        return Err(CheckError(format!(
            "dependency policy violations: {edge_diagnostics:?}"
        )));
    }

    let exceptions = ExceptionSet::parse(
        &fs::read_to_string(root.join("architecture/exceptions.toml")).map_err(error)?,
    )
    .map_err(error)?;
    validate_exceptions(&exceptions, Utc::now().date_naive(), &[]).map_err(error)?;

    let mut manifests = Vec::new();
    let mut owned = Vec::new();
    for path in sorted_files(&root.join("architecture/intents"), "toml")? {
        let manifest =
            IntentManifest::parse(&fs::read_to_string(path).map_err(error)?).map_err(error)?;
        owned.extend(manifest.owned_files().iter().cloned());
        manifests.push(manifest);
    }
    validate_intents(&manifests, &IntentDiff::new(owned)).map_err(error)?;
    if !diagnostics.is_empty() {
        return Err(CheckError(render_diagnostics(
            diagnostics,
            OutputFormat::Human,
        )?));
    }
    Ok(())
}

fn discover_rust(
    root: &Path,
    directory: &Path,
    output: &mut Vec<PathBuf>,
) -> Result<(), CheckError> {
    let mut entries = fs::read_dir(directory)
        .map_err(error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error)?;
    entries.sort_by_key(std::fs::DirEntry::file_name);
    for entry in entries {
        let path = entry.path();
        if path.is_dir() {
            let relative = path.strip_prefix(root).map_err(error)?;
            if path.file_name().is_some_and(|name| name == "target")
                || relative == Path::new("tools/xtask/templates")
            {
                continue;
            }
            discover_rust(root, &path, output)?;
        } else if path.extension().is_some_and(|extension| extension == "rs") {
            output.push(path);
        }
    }
    let _ = root;
    Ok(())
}

fn sorted_files(directory: &Path, extension: &str) -> Result<Vec<PathBuf>, CheckError> {
    let mut files = fs::read_dir(directory)
        .map_err(error)?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|value| value == extension))
        .collect::<Vec<_>>();
    files.sort();
    Ok(files)
}

fn crate_name(path: &str) -> Option<&str> {
    let mut parts = path.split('/');
    match (parts.next(), parts.next()) {
        (Some("crates" | "tools"), Some(name)) => Some(name),
        _ => None,
    }
}

fn is_non_production(path: &str) -> bool {
    path.contains("/tests/") || path.contains("/examples/") || path.contains("/benches/")
}

/// Renders diagnostics in the stable human or SARIF contract.
///
/// # Errors
///
/// Returns an error only if SARIF JSON serialization fails.
pub fn render_diagnostics(
    diagnostics: &[Diagnostic],
    format: OutputFormat,
) -> Result<String, CheckError> {
    match format {
        OutputFormat::Human => Ok(diagnostics
            .iter()
            .map(|diagnostic| format!(
                "{} {}:{} symbol `{}`; permitted destination: {}; guidance: {}",
                diagnostic.rule_id,
                diagnostic.path,
                diagnostic.line,
                diagnostic.symbol,
                permitted_destination(diagnostic.rule_id),
                diagnostic.guidance
            ))
            .collect::<Vec<_>>()
            .join("\n")),
        OutputFormat::Sarif => serde_json::to_string_pretty(&json!({
            "version": "2.1.0",
            "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
            "runs": [{
                "tool": { "driver": { "name": "walking-dog API architecture validator" } },
                "results": diagnostics.iter().map(|diagnostic| json!({
                    "ruleId": diagnostic.rule_id,
                    "message": { "text": format!("symbol `{}`; permitted destination: {}; guidance: {}", diagnostic.symbol, permitted_destination(diagnostic.rule_id), diagnostic.guidance) },
                    "locations": [{ "physicalLocation": {
                        "artifactLocation": { "uri": diagnostic.path },
                        "region": { "startLine": diagnostic.line }
                    }}]
                })).collect::<Vec<_>>()
            }]
        })).map_err(error),
    }
}

fn permitted_destination(rule: &str) -> &'static str {
    match rule {
        "API-ARCH-001" | "API-ARCH-009" => "api-bootstrap",
        "API-ARCH-002" | "API-ARCH-011" => "adapter-postgres",
        "API-ARCH-003" => "matching adapter-aws crate or api-bootstrap wiring",
        "API-ARCH-004" | "API-ARCH-008" => "adapter-graphql presentation boundary",
        "API-ARCH-006" | "API-ARCH-007" | "API-ARCH-010" => "application port or domain type",
        "API-ARCH-005" => "typed error propagation",
        "API-ARCH-012" => "approved non-sensitive observability fields",
        _ => "dependency-policy.toml",
    }
}

fn error(value: impl Display) -> CheckError {
    CheckError(value.to_string())
}
