use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::BTreeSet, fs, path::Path};

const MARKER: &str = "@generated journey-generator:v1";
const MODULES: &[&str] = &[
    "identity",
    "owner",
    "dog",
    "walk_recording",
    "walk_event",
    "walk_insight",
];
const KINDS: &[&str] = &["command", "query"];
const JOURNEYS: &[&str] = &[
    "auth-onboarding",
    "dog-profile",
    "walk-events-photo",
    "walk-goal",
    "walk-history-owner-contribution",
    "walk-lifecycle",
];
const GRAPHQL: &[&str] = &["mutation", "query"];
const SEAMS: &[&str] = &["cognito", "dynamodb", "postgres", "s3", "sqs"];
const FAILURES: &[&str] = &[
    "validation",
    "unauthorized",
    "forbidden",
    "not_found",
    "conflict",
    "unavailable",
    "internal",
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Spec {
    version: u32,
    application_module: String,
    kind: String,
    journey: String,
    graphql_field: String,
    graphql_contract: String,
    seams: Vec<String>,
    failure_categories: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct Manifest {
    marker: String,
    generator_version: u32,
    use_case: String,
    application_module: String,
    journey: String,
    files: Vec<OwnedFile>,
}

#[derive(Serialize, Deserialize)]
struct OwnedFile {
    path: String,
    sha256: String,
}

pub fn generate(root: &Path, name: &str, spec_path: &Path) -> Result<(), String> {
    validate_name(name)?;
    let source = fs::read_to_string(spec_path).map_err(|e| format!("read spec: {e}"))?;
    let spec: Spec = toml::from_str(&source).map_err(|e| format!("invalid spec: {e}"))?;
    validate_spec(&spec)?;
    let snake = name.replace('-', "_");
    let mut outputs = render(name, &snake, &spec);
    let manifest_path = format!("architecture/manifests/{name}.toml");
    let owned = outputs
        .iter()
        .map(|(path, body)| OwnedFile {
            path: path.clone(),
            sha256: hash(body.as_bytes()),
        })
        .collect();
    let manifest = Manifest {
        marker: MARKER.into(),
        generator_version: 1,
        use_case: name.into(),
        application_module: spec.application_module.clone(),
        journey: spec.journey.clone(),
        files: owned,
    };
    outputs.push((
        manifest_path,
        format!(
            "# {MARKER}\n{}",
            toml::to_string_pretty(&manifest).map_err(|e| e.to_string())?
        ),
    ));

    for (relative, _) in &outputs {
        if root.join(relative).exists() {
            return Err(format!("collision: {relative}"));
        }
    }
    validate_outputs(&outputs, &spec)?;
    let stage = root.join(format!(".journey-generator-{name}-{}", std::process::id()));
    if stage.exists() {
        fs::remove_dir_all(&stage).map_err(|e| e.to_string())?;
    }
    for (relative, body) in &outputs {
        let target = stage.join(relative);
        fs::create_dir_all(target.parent().ok_or("invalid target")?).map_err(|e| e.to_string())?;
        fs::write(&target, body).map_err(|e| e.to_string())?;
    }
    // All fallible content validation and collision detection happens before workspace placement.
    for (relative, _) in &outputs {
        let from = stage.join(relative);
        let to = root.join(relative);
        fs::create_dir_all(to.parent().ok_or("invalid target")?).map_err(|e| e.to_string())?;
        fs::rename(from, to).map_err(|e| format!("place {relative}: {e}"))?;
    }
    fs::remove_dir_all(stage).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn verify(root: &Path) -> Result<(), String> {
    let directory = root.join("architecture/manifests");
    if !directory.exists() {
        return Ok(());
    }
    let mut owned_paths = BTreeSet::new();
    for entry in fs::read_dir(directory).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|v| v.to_str()) != Some("toml") {
            continue;
        }
        let text = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        if !text.contains(MARKER) {
            continue;
        }
        let manifest: Manifest =
            toml::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
        if manifest.marker != MARKER || manifest.generator_version != 1 || manifest.files.is_empty()
        {
            return Err(format!("invalid generated manifest: {}", path.display()));
        }
        for owned in manifest.files {
            if !owned_paths.insert(owned.path.clone()) {
                return Err(format!("duplicate generated ownership: {}", owned.path));
            }
            let generated = root.join(&owned.path);
            let body = fs::read(&generated)
                .map_err(|_| format!("missing generated file: {}", owned.path))?;
            let text = std::str::from_utf8(&body)
                .map_err(|_| format!("non-UTF8 generated file: {}", owned.path))?;
            if !text.contains(MARKER) || hash(&body) != owned.sha256 {
                return Err(format!("generated file drift: {}", owned.path));
            }
        }
    }
    for generated_root in [
        "crates",
        "docs/harness/journeys/generated",
        "fixtures/observability",
    ] {
        collect_marked_files(root, &root.join(generated_root), &mut |relative| {
            if !owned_paths.contains(relative) {
                return Err(format!(
                    "generated file has no manifest ownership: {relative}"
                ));
            }
            Ok(())
        })?;
    }
    Ok(())
}

fn collect_marked_files(
    root: &Path,
    directory: &Path,
    visit: &mut impl FnMut(&str) -> Result<(), String>,
) -> Result<(), String> {
    if !directory.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
        let path = entry.map_err(|error| error.to_string())?.path();
        if path.is_dir() {
            collect_marked_files(root, &path, visit)?;
        } else if fs::read_to_string(&path).is_ok_and(|body| body.contains(MARKER)) {
            let relative = path
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_str()
                .ok_or_else(|| format!("non-UTF8 path: {}", path.display()))?;
            visit(relative)?;
        }
    }
    Ok(())
}

fn validate_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.starts_with('-')
        || name.ends_with('-')
        || !name
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
    {
        return Err("use-case must be lower kebab-case".into());
    }
    Ok(())
}

fn validate_spec(spec: &Spec) -> Result<(), String> {
    if spec.version != 1 {
        return Err("unsupported spec version".into());
    }
    registry("application_module", &spec.application_module, MODULES)?;
    registry("kind", &spec.kind, KINDS)?;
    registry("journey", &spec.journey, JOURNEYS)?;
    registry("graphql_contract", &spec.graphql_contract, GRAPHQL)?;
    if (spec.kind == "command") != (spec.graphql_contract == "mutation") {
        return Err("command requires mutation and query requires query".into());
    }
    if spec.graphql_field.is_empty()
        || !spec
            .graphql_field
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_')
    {
        return Err("invalid GraphQL field".into());
    }
    list_registry("seam", &spec.seams, SEAMS, true)?;
    list_registry("failure category", &spec.failure_categories, FAILURES, true)
}

fn registry(label: &str, value: &str, values: &[&str]) -> Result<(), String> {
    if values.contains(&value) {
        Ok(())
    } else {
        Err(format!(
            "unknown {label}: {value}; allowed: {}",
            values.join(", ")
        ))
    }
}
fn list_registry(
    label: &str,
    values: &[String],
    allowed: &[&str],
    required: bool,
) -> Result<(), String> {
    if required && values.is_empty() {
        return Err(format!("at least one {label} is required"));
    }
    let mut unique = BTreeSet::new();
    for value in values {
        registry(label, value, allowed)?;
        if !unique.insert(value) {
            return Err(format!("duplicate {label}: {value}"));
        }
    }
    Ok(())
}

fn render(name: &str, snake: &str, spec: &Spec) -> Vec<(String, String)> {
    let pascal = snake.split('_').map(capitalize).collect::<String>();
    let failures = spec
        .failure_categories
        .iter()
        .map(|v| format!("    {},", capitalize(v)))
        .collect::<Vec<_>>()
        .join("\n");
    let mut files = vec![
        (
            format!(
                "crates/application/src/{}/{snake}.rs",
                spec.application_module
            ),
            template(
                include_str!("../templates/journey/use_case.rs"),
                &[
                    ("NAME", name),
                    ("PASCAL", &pascal),
                    ("FAILURES", &failures),
                    ("KIND", &spec.kind),
                ],
            ),
        ),
        (
            format!(
                "crates/application/src/{}/contracts/{snake}.rs",
                spec.application_module
            ),
            template(
                include_str!("../templates/journey/contract.rs"),
                &[("NAME", name), ("PASCAL", &pascal)],
            ),
        ),
        (
            format!("crates/adapter-graphql/src/{snake}.rs"),
            template(
                include_str!("../templates/journey/graphql.rs"),
                &[
                    ("NAME", name),
                    ("PASCAL", &pascal),
                    ("FIELD", &spec.graphql_field),
                    ("GRAPHQL", &spec.graphql_contract),
                ],
            ),
        ),
        (
            format!("docs/harness/journeys/generated/{name}.md"),
            format!(
                "<!-- {MARKER} -->\n# {pascal}\n\nCanonical journey: `{}`.\n\nOwner: application module `{}`.\n",
                spec.journey, spec.application_module
            ),
        ),
        (
            format!("fixtures/observability/{name}.toml"),
            template(
                include_str!("../templates/journey/observability.rs"),
                &[("NAME", name), ("JOURNEY", &spec.journey)],
            ),
        ),
    ];
    for seam in &spec.seams {
        let production = if seam == "postgres" {
            "adapter-postgres"
        } else {
            &format!("adapter-aws-{seam}")
        };
        files.push((format!("crates/{production}/src/{snake}.rs"), format!("// {MARKER}\n// Production {seam} adapter contract skeleton for {name}.\npub struct {pascal}{0}Adapter;\n", capitalize(seam))));
        files.push((format!("crates/application/src/{}/adapters/in_memory_{seam}_{snake}.rs", spec.application_module), format!("// {MARKER}\n// In-memory {seam} adapter paired with the production adapter for contract testing.\npub struct InMemory{0}{pascal}Adapter;\n", capitalize(seam))));
    }
    files
}

fn validate_outputs(outputs: &[(String, String)], spec: &Spec) -> Result<(), String> {
    for (path, body) in outputs {
        if !body.contains(MARKER)
            || ["TODO", "TBD", "unimplemented!"]
                .iter()
                .any(|bad| body.contains(bad))
        {
            return Err(format!("invalid generated output: {path}"));
        }
    }
    for seam in &spec.seams {
        let count = outputs
            .iter()
            .filter(|(path, _)| path.contains(seam))
            .count();
        if count < 2 {
            return Err(format!("seam {seam} lacks production/in-memory pair"));
        }
    }
    Ok(())
}
fn template(source: &str, replacements: &[(&str, &str)]) -> String {
    replacements
        .iter()
        .fold(source.to_owned(), |out, (key, value)| {
            out.replace(&format!("{{{{{key}}}}}"), value)
        })
}
fn capitalize(value: &str) -> String {
    let mut chars = value.chars();
    chars.next().map_or_else(String::new, |first| {
        first.to_ascii_uppercase().to_string() + chars.as_str()
    })
}
fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
