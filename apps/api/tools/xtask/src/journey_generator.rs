use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::BTreeSet, fs, io::Write, path::Path};

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

#[derive(Serialize, Deserialize)]
struct GeneratedIndex {
    marker: String,
    generator_version: u32,
    journeys: Vec<GeneratedJourney>,
}

#[derive(Serialize, Deserialize)]
struct GeneratedJourney {
    use_case: String,
    destination: String,
    manifest: String,
}

struct WriterLock {
    path: std::path::PathBuf,
    file: Option<fs::File>,
    release_attempted: bool,
}

impl WriterLock {
    fn acquire(path: &Path) -> Result<Self, String> {
        let file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)
            .map_err(|error| format!("generated index writer lock unavailable: {error}"))?;
        let mut guard = Self {
            path: path.into(),
            file: Some(file),
            release_attempted: false,
        };
        let initialization =
            if std::env::var("XTASK_TEST_LOCK_INIT_FAILURE").as_deref() == Ok("write") {
                Err("injected lock initialization write failure".into())
            } else if let Err(error) = writeln!(
                guard.file.as_mut().expect("lock file"),
                "pid={}",
                std::process::id()
            ) {
                Err(format!("lock initialization write failed: {error}"))
            } else if std::env::var("XTASK_TEST_LOCK_INIT_FAILURE").as_deref() == Ok("sync") {
                Err("injected lock initialization sync failure".into())
            } else {
                guard
                    .file
                    .as_ref()
                    .expect("lock file")
                    .sync_all()
                    .map_err(|error| format!("lock initialization sync failed: {error}"))
            };
        if let Err(error) = initialization {
            return match guard.release() {
                Ok(()) => Err(error),
                Err(release) => Err(format!("{error}; {release}")),
            };
        }
        Ok(guard)
    }

    fn release(&mut self) -> Result<(), String> {
        self.release_attempted = true;
        drop(self.file.take());
        if std::env::var_os("XTASK_TEST_LOCK_RELEASE_FAILURE").is_some() {
            return Err("injected writer lock release failure".into());
        }
        fs::remove_file(&self.path).map_err(|error| format!("writer lock release failed: {error}"))
    }

    fn run<T>(path: &Path, operation: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
        let mut guard = Self::acquire(path)?;
        let result = operation();
        let release = guard.release();
        match (result, release) {
            (Ok(value), Ok(())) => Ok(value),
            (Err(error), Ok(())) => Err(error),
            (Ok(_), Err(release)) => Err(release),
            (Err(error), Err(release)) => Err(format!("{error}; {release}")),
        }
    }
}

impl Drop for WriterLock {
    fn drop(&mut self) {
        if !self.release_attempted {
            let _removed = fs::remove_file(&self.path);
        }
    }
}

struct PublicationTransaction<'a> {
    destination: &'a Path,
    generated_root: &'a Path,
    architecture: Option<(&'a Path, bool)>,
    finalized: bool,
}

impl<'a> PublicationTransaction<'a> {
    fn new(destination: &'a Path, generated_root: &'a Path) -> Self {
        Self {
            destination,
            generated_root,
            architecture: None,
            finalized: false,
        }
    }

    fn track_architecture(&mut self, path: &'a Path, existed: bool) {
        self.architecture = Some((path, existed));
    }

    fn finalize<T>(&mut self, result: Result<T, String>) -> Result<T, String> {
        self.finalized = true;
        let operation_error = match result {
            Ok(value) => return Ok(value),
            Err(error) => error,
        };
        let artifact = rollback_destination(self.destination, self.generated_root);
        let architecture = self.architecture.map_or(Ok(()), |(path, existed)| {
            cleanup_architecture(path, existed)
        });
        let mut errors = vec![operation_error];
        if let Err(error) = artifact {
            errors.push(error);
        }
        if let Err(error) = architecture {
            errors.push(error);
        }
        Err(errors.join("; "))
    }
}

impl Drop for PublicationTransaction<'_> {
    fn drop(&mut self) {
        if self.finalized {
            return;
        }
        let _artifact_rollback = rollback_destination(self.destination, self.generated_root);
        if let Some((architecture, existed)) = self.architecture {
            let _architecture_rollback = cleanup_architecture(architecture, existed);
        }
    }
}

#[allow(clippy::too_many_lines)] // Transaction sequencing is intentionally kept linear for auditable rollback.
pub fn generate(root: &Path, name: &str, spec_path: &Path) -> Result<(), String> {
    validate_name(name)?;
    let source = fs::read_to_string(spec_path).map_err(|e| format!("read spec: {e}"))?;
    let spec: Spec = toml::from_str(&source).map_err(|e| format!("invalid spec: {e}"))?;
    validate_spec(&spec)?;
    let snake = name.replace('-', "_");
    let mut outputs = render(name, &snake, &spec);
    let manifest_path = "architecture/manifest.toml".to_owned();
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
        manifest_path.clone(),
        format!(
            "# {MARKER}\n{}",
            toml::to_string_pretty(&manifest).map_err(|e| e.to_string())?
        ),
    ));

    validate_outputs(&outputs, &spec)?;
    let lock_path = std::env::var_os("XTASK_INDEX_LOCK_PATH").map_or_else(
        || {
            let lock_identity = fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
            std::env::temp_dir().join(format!(
                "walking-dog-journey-index-{}.lock",
                hash(lock_identity.to_string_lossy().as_bytes())
            ))
        },
        std::path::PathBuf::from,
    );
    WriterLock::run(&lock_path, || {
        let generated_root = root.join("generated/journeys");
        let destination = generated_root.join(name);
        let index_path = root.join("architecture/generated-journeys.toml");
        if destination.exists() {
            return Err("generated Journey destination already exists".into());
        }
        let original_index = if index_path.exists() {
            Some(fs::read(&index_path).map_err(|error| error.to_string())?)
        } else {
            None
        };
        let mut index = if let Some(bytes) = &original_index {
            toml::from_str::<GeneratedIndex>(
                std::str::from_utf8(bytes).map_err(|error| error.to_string())?,
            )
            .map_err(|error| error.to_string())?
        } else {
            GeneratedIndex {
                marker: MARKER.into(),
                generator_version: 1,
                journeys: Vec::new(),
            }
        };
        if original_index.is_some() {
            validate_index(&index)?;
        }
        if index
            .journeys
            .iter()
            .any(|journey| journey.use_case == name)
        {
            return Err(format!("generated Journey already indexed: {name}"));
        }
        index.journeys.push(GeneratedJourney {
            use_case: name.into(),
            destination: format!("generated/journeys/{name}/artifacts"),
            manifest: format!("generated/journeys/{name}/artifacts/{manifest_path}"),
        });
        let index_body = format!(
            "# {MARKER}\n{}",
            toml::to_string_pretty(&index).map_err(|error| error.to_string())?
        );
        let stage_parent = root.parent().unwrap_or(root);
        let stage = tempfile::Builder::new()
            .prefix(".journey-generator-")
            .tempdir_in(stage_parent)
            .map_err(|error| format!("create exclusive staging directory: {error}"))?;
        for (relative, body) in &outputs {
            let target = stage.path().join(relative);
            fs::create_dir_all(target.parent().ok_or("invalid target")?)
                .map_err(|e| e.to_string())?;
            fs::write(&target, body).map_err(|e| e.to_string())?;
        }
        if let Ok(relative) = std::env::var("XTASK_TEST_RACE_DESTINATION") {
            let raced = destination.join(relative);
            fs::create_dir_all(raced.parent().ok_or("invalid raced destination")?)
                .map_err(|error| error.to_string())?;
            fs::write(raced, "racing owner\n").map_err(|error| error.to_string())?;
        }
        fs::create_dir_all(&generated_root).map_err(|error| error.to_string())?;
        fs::create_dir(&destination).map_err(|error| {
            format!("atomic destination reservation refused collision: {error}")
        })?;
        let published_tree = destination.join("artifacts");
        if let Err(error) = fs::rename(stage.path(), &published_tree) {
            fs::remove_dir(&destination).map_err(|rollback| {
                format!("atomic publish failed ({error}); reservation rollback failed ({rollback})")
            })?;
            return Err(format!("atomic publish failed: {error}"));
        }
        let mut transaction = PublicationTransaction::new(&destination, &generated_root);
        let result = (|| {
            if std::env::var_os("XTASK_TEST_FAIL_AFTER_PLACEMENTS").is_some() {
                rollback_destination(&destination, &generated_root)?;
                return Err("injected post-publication failure".into());
            }
            let architecture = index_path.parent().ok_or("invalid index path")?;
            let architecture_existed = architecture.exists();
            transaction.track_architecture(architecture, architecture_existed);
            if std::env::var("XTASK_TEST_POST_PUBLICATION_FAILURE").as_deref() == Ok("architecture")
            {
                return Err("injected architecture creation failure".into());
            }
            fs::create_dir_all(architecture).map_err(|error| error.to_string())?;
            let mut staged_index = match tempfile::NamedTempFile::new_in(architecture) {
                Ok(file) => file,
                Err(error) => {
                    rollback_destination(&destination, &generated_root)?;
                    cleanup_architecture(architecture, architecture_existed)?;
                    return Err(format!("stage index creation failed: {error}"));
                }
            };
            if std::env::var("XTASK_TEST_INDEX_FAILURE").as_deref() == Ok("write") {
                rollback_destination(&destination, &generated_root)?;
                drop(staged_index);
                cleanup_architecture(architecture, architecture_existed)?;
                return Err("injected index write failure".into());
            }
            if let Err(error) = staged_index.write_all(index_body.as_bytes()) {
                rollback_destination(&destination, &generated_root)?;
                drop(staged_index);
                cleanup_architecture(architecture, architecture_existed)?;
                return Err(format!("stage index write failed: {error}"));
            }
            if std::env::var("XTASK_TEST_INDEX_FAILURE").as_deref() == Ok("sync") {
                rollback_destination(&destination, &generated_root)?;
                drop(staged_index);
                cleanup_architecture(architecture, architecture_existed)?;
                return Err("injected index sync failure".into());
            }
            if let Err(error) = staged_index.as_file().sync_all() {
                rollback_destination(&destination, &generated_root)?;
                drop(staged_index);
                cleanup_architecture(architecture, architecture_existed)?;
                return Err(format!("stage index sync failed: {error}"));
            }
            if let Ok(owner) = std::env::var("XTASK_TEST_RACE_INDEX") {
                fs::OpenOptions::new()
                    .append(true)
                    .open(&index_path)
                    .and_then(|mut file| writeln!(file, "# {owner}"))
                    .map_err(|error| error.to_string())?;
            }
            if std::env::var("XTASK_TEST_POST_PUBLICATION_FAILURE").as_deref()
                == Ok("live-index-read")
            {
                return Err("injected live index read failure".into());
            }
            let current_index = if index_path.exists() {
                Some(fs::read(&index_path).map_err(|error| error.to_string())?)
            } else {
                None
            };
            if current_index != original_index {
                rollback_destination(&destination, &generated_root)?;
                drop(staged_index);
                cleanup_architecture(architecture, architecture_existed)?;
                return Err("independent index changed concurrently".into());
            }
            if let Ok(owner) = std::env::var("XTASK_TEST_BOUNDARY_LOCK_PROBE")
                && let Ok(mut concurrent) = fs::OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&lock_path)
            {
                writeln!(concurrent, "{owner}").map_err(|error| error.to_string())?;
                fs::OpenOptions::new()
                    .append(true)
                    .open(&index_path)
                    .and_then(|mut file| writeln!(file, "# {owner}"))
                    .map_err(|error| error.to_string())?;
                fs::remove_file(&lock_path).map_err(|error| error.to_string())?;
            }
            if std::env::var("XTASK_TEST_INDEX_FAILURE").as_deref() == Ok("persist") {
                rollback_destination(&destination, &generated_root)?;
                drop(staged_index);
                cleanup_architecture(architecture, architecture_existed)?;
                return Err("injected index persist failure".into());
            }
            if let Err(error) = staged_index.persist(&index_path) {
                rollback_destination(&destination, &generated_root)?;
                drop(error.file);
                cleanup_architecture(architecture, architecture_existed)?;
                return Err(format!("atomic index publish failed: {}", error.error));
            }
            Ok(())
        })();
        transaction.finalize(result)
    })
}

pub fn verify(root: &Path) -> Result<(), String> {
    let index_path = root.join("architecture/generated-journeys.toml");
    if !index_path.exists() {
        if root.join("generated/journeys").exists() {
            return Err("generated Journey tree exists without independent index".into());
        }
        return Ok(());
    }
    let index_text = fs::read_to_string(&index_path).map_err(|error| error.to_string())?;
    let index: GeneratedIndex = toml::from_str(&index_text).map_err(|error| error.to_string())?;
    validate_index(&index)?;
    let mut owned_paths = BTreeSet::new();
    for journey in index.journeys {
        let destination = root.join(&journey.destination);
        let path = root.join(&journey.manifest);
        if !destination.is_dir() || !path.starts_with(&destination) {
            return Err(format!(
                "missing or invalid generated destination: {}",
                journey.use_case
            ));
        }
        let text = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let manifest: Manifest =
            toml::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
        if manifest.marker != MARKER
            || manifest.generator_version != 1
            || manifest.files.is_empty()
            || manifest.use_case != journey.use_case
        {
            return Err(format!("invalid generated manifest: {}", path.display()));
        }
        for owned in manifest.files {
            if !owned_paths.insert(owned.path.clone()) {
                return Err(format!("duplicate generated ownership: {}", owned.path));
            }
            let generated = destination.join(&owned.path);
            let body = fs::read(&generated)
                .map_err(|_| format!("missing generated file: {}", owned.path))?;
            let text = std::str::from_utf8(&body)
                .map_err(|_| format!("non-UTF8 generated file: {}", owned.path))?;
            if !text.contains(MARKER) || hash(&body) != owned.sha256 {
                return Err(format!("generated file drift: {}", owned.path));
            }
        }
    }
    Ok(())
}

fn validate_index(index: &GeneratedIndex) -> Result<(), String> {
    if index.marker != MARKER || index.generator_version != 1 || index.journeys.is_empty() {
        return Err("invalid independent generated Journey index".into());
    }
    let mut names = BTreeSet::new();
    let mut destinations = BTreeSet::new();
    for journey in &index.journeys {
        validate_name(&journey.use_case)?;
        let expected_destination = format!("generated/journeys/{}/artifacts", journey.use_case);
        let expected_manifest = format!("{expected_destination}/architecture/manifest.toml");
        if !names.insert(&journey.use_case)
            || !destinations.insert(&journey.destination)
            || journey.destination != expected_destination
            || journey.manifest != expected_manifest
        {
            return Err(format!(
                "invalid or duplicate generated Journey index entry: {}",
                journey.use_case
            ));
        }
    }
    Ok(())
}

fn rollback_destination(destination: &Path, generated_root: &Path) -> Result<(), String> {
    if std::env::var("XTASK_TEST_ROLLBACK_FAILURE").as_deref() == Ok("artifact") {
        return Err("injected artifact rollback failure".into());
    }
    if destination.exists() {
        fs::remove_dir_all(destination)
            .map_err(|error| format!("artifact rollback failed: {error}"))?;
    }
    for directory in [
        generated_root,
        generated_root.parent().unwrap_or(generated_root),
    ] {
        if directory.exists()
            && fs::read_dir(directory)
                .map_err(|error| format!("rollback inspection failed: {error}"))?
                .next()
                .is_none()
        {
            fs::remove_dir(directory)
                .map_err(|error| format!("empty directory rollback failed: {error}"))?;
        }
    }
    Ok(())
}

fn cleanup_architecture(directory: &Path, existed: bool) -> Result<(), String> {
    if std::env::var("XTASK_TEST_ROLLBACK_FAILURE").as_deref() == Ok("architecture") {
        return Err("injected architecture rollback failure".into());
    }
    if !existed
        && directory.exists()
        && fs::read_dir(directory)
            .map_err(|error| error.to_string())?
            .next()
            .is_none()
    {
        fs::remove_dir(directory)
            .map_err(|error| format!("architecture rollback failed: {error}"))?;
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
