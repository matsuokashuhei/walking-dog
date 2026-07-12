use std::error::Error;
use std::fmt::{self, Display, Formatter};
use std::fs;
use std::path::{Path, PathBuf};

use cargo_metadata::MetadataCommand;
use chrono::Utc;
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::ast::{Diagnostic, SourceUnit, analyze_source_set};
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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CheckOutcome {
    pub diagnostics: Vec<Diagnostic>,
}

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
pub fn check_workspace(root: &Path, validate_repository: bool) -> Result<CheckOutcome, CheckError> {
    check_workspace_against(root, validate_repository, None)
}

/// Checks the workspace and optionally verifies intent against explicit Git revisions.
///
/// # Errors
///
/// Fails closed for discovery, parsing, policy, exception, intent, or Git errors.
pub fn check_workspace_against(
    root: &Path,
    validate_repository: bool,
    revisions: Option<(&str, &str)>,
) -> Result<CheckOutcome, CheckError> {
    let mut sources = Vec::new();
    discover_rust(root, root, &mut sources)?;
    let mut owned_sources = Vec::new();
    for path in sources {
        let relative = path
            .strip_prefix(root)
            .map_err(error)?
            .to_string_lossy()
            .into_owned();
        let crate_name = crate_name(&relative)
            .ok_or_else(|| {
                CheckError(format!(
                    "unknown Rust source outside a workspace crate: {relative}"
                ))
            })?
            .to_owned();
        let source = fs::read_to_string(&path).map_err(error)?;
        owned_sources.push((crate_name, relative, source));
    }
    let image_sources = owned_sources
        .iter()
        .map(|(_, path, source)| (path.as_str(), source.as_str()))
        .collect::<Vec<_>>();
    crate::images::validate_testcontainers_source_set(&image_sources).map_err(error)?;
    let units = owned_sources
        .iter()
        .map(|(crate_name, path, source)| SourceUnit {
            crate_name,
            path,
            source,
            production: !is_non_production(path),
        })
        .collect::<Vec<_>>();
    let mut diagnostics = analyze_source_set(&units)
        .map_err(error)?
        .into_iter()
        .filter(|diagnostic| {
            diagnostic.path.starts_with("crates/") && !is_non_production(&diagnostic.path)
        })
        .collect::<Vec<_>>();
    if validate_repository {
        diagnostics = validate_repository_files(root, &diagnostics, revisions)?;
    }
    Ok(CheckOutcome { diagnostics })
}

fn validate_repository_files(
    root: &Path,
    diagnostics: &[Diagnostic],
    revisions: Option<(&str, &str)>,
) -> Result<Vec<Diagnostic>, CheckError> {
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
    for package in &metadata.packages {
        let manifest_path = package.manifest_path.as_std_path();
        crate::policy::validate_testcontainers_dependency_names(
            &manifest_path.to_string_lossy(),
            &fs::read_to_string(manifest_path).map_err(error)?,
        )
        .map_err(error)?;
    }
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
    let observed_owned = diagnostics
        .iter()
        .map(|diagnostic| {
            let crate_name = crate_name(&diagnostic.path).ok_or_else(|| {
                CheckError(format!("unknown diagnostic crate: {}", diagnostic.path))
            })?;
            Ok((
                crate_name.to_owned(),
                diagnostic_fingerprint(crate_name, diagnostic),
            ))
        })
        .collect::<Result<Vec<_>, CheckError>>()?;
    let observed = diagnostics
        .iter()
        .zip(&observed_owned)
        .map(
            |(diagnostic, (crate_name, fingerprint))| crate::exceptions::ObservedViolation {
                rule: diagnostic.rule_id,
                crate_name,
                file: &diagnostic.path,
                symbol: &diagnostic.symbol,
                fingerprint,
            },
        )
        .collect::<Vec<_>>();
    validate_exceptions(&exceptions, Utc::now().date_naive(), &observed).map_err(error)?;

    let mut manifests = Vec::new();
    for path in sorted_files(&root.join("architecture/intents"), "toml")? {
        let manifest =
            IntentManifest::parse(&fs::read_to_string(path).map_err(error)?).map_err(error)?;
        manifests.push(manifest);
    }
    let mut changed_files = Vec::new();
    for path in sorted_files(&root.join("architecture/diffs"), "toml")? {
        let diff =
            IntentDiff::parse_artifact(&fs::read_to_string(path).map_err(error)?).map_err(error)?;
        changed_files.extend(diff.changed_files().iter().cloned());
    }
    let artifact_diff = IntentDiff::new(changed_files);
    let diff = if let Some((base, head)) = revisions {
        let actual = IntentDiff::from_git(root, base, head).map_err(error)?;
        if actual != artifact_diff {
            return Err(CheckError(
                "checked-in intent diff artifact does not match the controller-defined Git diff"
                    .to_owned(),
            ));
        }
        actual
    } else {
        artifact_diff
    };
    validate_intents(&manifests, &diff).map_err(error)?;
    unsuppressed_diagnostics(diagnostics, &exceptions)
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
    let mut files = collect_fail_closed(fs::read_dir(directory).map_err(error)?)?
        .into_iter()
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|value| value == extension))
        .collect::<Vec<_>>();
    files.sort();
    Ok(files)
}

fn collect_fail_closed<T, E: Display>(
    entries: impl IntoIterator<Item = Result<T, E>>,
) -> Result<Vec<T>, CheckError> {
    entries
        .into_iter()
        .collect::<Result<Vec<_>, _>>()
        .map_err(error)
}

#[must_use]
pub fn diagnostic_fingerprint(crate_name: &str, diagnostic: &Diagnostic) -> String {
    let canonical_symbol = diagnostic
        .symbol
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let input = format!(
        "{}\0{}\0{}\0{}\0{}\0{}",
        diagnostic.rule_id,
        crate_name,
        diagnostic.path,
        diagnostic.line,
        diagnostic.column,
        canonical_symbol
    );
    format!("sha256:{:x}", Sha256::digest(input.as_bytes()))
}

/// Removes only diagnostics matched by exact, fingerprinted exceptions.
///
/// # Errors
///
/// Fails if a diagnostic cannot be assigned to a workspace crate.
pub fn unsuppressed_diagnostics(
    diagnostics: &[Diagnostic],
    exceptions: &ExceptionSet,
) -> Result<Vec<Diagnostic>, CheckError> {
    diagnostics
        .iter()
        .filter_map(|diagnostic| {
            let Some(crate_name) = crate_name(&diagnostic.path) else {
                return Some(Err(CheckError(format!(
                    "unknown diagnostic crate: {}",
                    diagnostic.path
                ))));
            };
            let fingerprint = diagnostic_fingerprint(crate_name, diagnostic);
            let violation = crate::exceptions::ObservedViolation {
                rule: diagnostic.rule_id,
                crate_name,
                file: &diagnostic.path,
                symbol: &diagnostic.symbol,
                fingerprint: &fingerprint,
            };
            (!exceptions.permits(&violation)).then(|| Ok(diagnostic.clone()))
        })
        .collect()
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
                "{} {}:{}:{} symbol `{}`; permitted destination: {}; guidance: {}",
                diagnostic.rule_id,
                diagnostic.path,
                diagnostic.line,
                diagnostic.column,
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
                        "region": {
                            "startLine": diagnostic.line,
                            "startColumn": diagnostic.column
                        }
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

#[cfg(test)]
mod tests {
    use super::collect_fail_closed;

    #[test]
    fn directory_entry_error_is_not_skipped() {
        let entries = vec![Ok("known.rs"), Err("unreadable entry")];
        let result = collect_fail_closed(entries);
        assert!(result.is_err());
        assert!(
            result
                .expect_err("must fail closed")
                .to_string()
                .contains("unreadable entry")
        );
    }
}
