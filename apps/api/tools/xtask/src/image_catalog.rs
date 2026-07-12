use std::fs;
use std::path::Path;

use serde::Deserialize;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Catalog {
    version: u8,
    postgres: Image,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Image {
    name: String,
    tag: String,
    digest: String,
}

pub fn generate(root: &Path) -> Result<(), String> {
    let catalog: Catalog = serde_json::from_slice(
        &fs::read(root.join("architecture/test-images.json")).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    if catalog.version != 1 {
        return Err("unsupported image catalog version".into());
    }
    if !is_image_component(&catalog.postgres.name) || !is_image_component(&catalog.postgres.tag) {
        return Err("postgres name and tag must use closed image syntax".into());
    }
    if !is_digest(&catalog.postgres.digest) {
        return Err("postgres digest must be sha256 plus 64 lowercase hex characters".into());
    }
    let output = include_str!("../templates/postgres_container.rs")
        .replace("{{NAME}}", &catalog.postgres.name)
        .replace(
            "{{REFERENCE}}",
            &format!("{}@{}", catalog.postgres.tag, catalog.postgres.digest),
        );
    let path = root.join("tools/harness-runtime/src/generated_postgres.rs");
    fs::create_dir_all(path.parent().unwrap()).map_err(|error| error.to_string())?;
    fs::write(path, output).map_err(|error| error.to_string())
}

pub fn verify(root: &Path) -> Result<(), String> {
    let path = root.join("tools/harness-runtime/src/generated_postgres.rs");
    let actual = fs::read(&path).map_err(|error| error.to_string())?;
    let temporary = tempfile::tempdir().map_err(|error| error.to_string())?;
    fs::create_dir_all(temporary.path().join("architecture")).map_err(|error| error.to_string())?;
    fs::copy(
        root.join("architecture/test-images.json"),
        temporary.path().join("architecture/test-images.json"),
    )
    .map_err(|error| error.to_string())?;
    generate(temporary.path())?;
    (actual
        == fs::read(
            temporary
                .path()
                .join("tools/harness-runtime/src/generated_postgres.rs"),
        )
        .map_err(|error| error.to_string())?)
    .then_some(())
    .ok_or_else(|| "generated image catalog drift".into())
}

fn is_digest(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value[7..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}
fn is_image_component(value: &str) -> bool {
    !value.is_empty()
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'.' | b'_' | b'-')
        })
}
