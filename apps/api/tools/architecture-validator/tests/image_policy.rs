use architecture_validator::image_policy::validate;
use std::fs;

fn fixture() -> tempfile::TempDir {
    let root = tempfile::tempdir().unwrap();
    for path in [
        "architecture",
        "tools/harness-runtime/src",
        "tools/xtask/templates",
    ] {
        fs::create_dir_all(root.path().join(path)).unwrap();
    }
    fs::write(root.path().join("architecture/test-images.json"), "{}").unwrap();
    fs::write(
        root.path().join("tools/harness-runtime/Cargo.toml"),
        "[dependencies]\ntestcontainers = \"0.27\"\n",
    )
    .unwrap();
    fs::write(root.path().join("tools/harness-runtime/src/generated_postgres.rs"), "// @generated image-catalog:v1\nuse testcontainers::GenericImage;\npub struct PostgresContainer { image: GenericImage }\nimpl PostgresContainer { pub fn start() {} pub fn connection_url(&self) -> &str { \"\" } }").unwrap();
    fs::write(
        root.path()
            .join("tools/xtask/templates/postgres_container.rs"),
        "use testcontainers::GenericImage; struct Template(GenericImage);",
    )
    .unwrap();
    root
}

#[test]
fn rejects_closed_surface_escapes() {
    for (path, body) in [
        (
            "crates/domain/Cargo.toml",
            "[dependencies]\ntestcontainers = \"0.27\"",
        ),
        (
            "crates/domain/Cargo.toml",
            "[dependencies]\ntc = { package = \"testcontainers\", version = \"0.27\" }",
        ),
        (
            "crates/domain/Cargo.toml",
            "[dev-dependencies]\ntestcontainers = \"0.27\"",
        ),
        (
            "crates/domain/Cargo.toml",
            "[build-dependencies]\ntestcontainers = \"0.27\"",
        ),
        (
            "crates/domain/Cargo.toml",
            "[target.'cfg(unix)'.dependencies]\ntestcontainers = \"0.27\"",
        ),
        (
            "crates/domain/Cargo.toml",
            "[package]\nbuild = \"build.rs\"",
        ),
        (
            "crates/domain/src/lib.rs",
            "use testcontainers::GenericImage;",
        ),
        (
            "crates/domain/src/lib.rs",
            "use { std::fmt, testcontainers::GenericImage };",
        ),
        ("crates/domain/src/lib.rs", "extern crate testcontainers;"),
        (
            "crates/domain/src/lib.rs",
            "fn image() { testcontainers::GenericImage::new(\"x\", \"y\"); }",
        ),
        ("crates/domain/build.rs", "fn main() {}"),
        ("crates/domain/src/lib.rs", "include!(\"generated.rs\");"),
    ] {
        let root = fixture();
        let full = root.path().join(path);
        fs::create_dir_all(full.parent().unwrap()).unwrap();
        fs::write(full, body).unwrap();
        assert!(validate(root.path()).is_err(), "{path}");
    }
}

#[test]
fn ignores_target_and_git_and_requires_generated_marker() {
    let root = fixture();
    for path in ["target/leak.rs", ".git/leak.rs"] {
        let full = root.path().join(path);
        fs::create_dir_all(full.parent().unwrap()).unwrap();
        fs::write(full, "use testcontainers::GenericImage;").unwrap();
    }
    let result = validate(root.path());
    assert!(result.is_ok(), "{result:?}");
    fs::write(
        root.path()
            .join("tools/harness-runtime/src/generated_postgres.rs"),
        "bad",
    )
    .unwrap();
    assert!(validate(root.path()).is_err());
}

#[test]
fn ignores_noncompiled_template_placeholders_but_rejects_template_escapes() {
    let root = fixture();
    fs::write(root.path().join("tools/xtask/templates/placeholder.rs"), "{{not Rust}}").unwrap();
    assert!(validate(root.path()).is_ok());
    fs::write(root.path().join("tools/xtask/templates/placeholder.rs"), "use testcontainers::GenericImage;").unwrap();
    assert!(validate(root.path()).is_err());
}

#[test]
fn rejects_public_generated_testcontainers_surfaces() {
    for exposed in [
        "pub struct PostgresContainer { pub image: GenericImage }",
        "pub fn image() -> GenericImage { loop {} }",
        "pub type Image = GenericImage;",
        "pub const IMAGE: GenericImage = loop {};",
        "pub static IMAGE: GenericImage = loop {};",
        "pub use testcontainers::GenericImage;",
    ] {
        let root = fixture();
        fs::write(
            root.path()
                .join("tools/harness-runtime/src/generated_postgres.rs"),
            format!("// @generated image-catalog:v1\nuse testcontainers::GenericImage;\n{exposed}"),
        )
        .unwrap();
        assert!(validate(root.path()).is_err(), "{exposed}");
    }
}
