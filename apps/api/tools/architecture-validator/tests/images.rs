use architecture_validator::images::validate_testcontainers_source;

const FACTORY: &str = r#"
use testcontainers::GenericImage;
const POSTGRES_NAME: &str = "postgres";
const POSTGRES_TAG: &str = "16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777";
fn postgres() -> GenericImage { GenericImage::new(POSTGRES_NAME, POSTGRES_TAG) }
"#;

#[test]
fn exact_closed_factory_is_allowed() {
    validate_testcontainers_source("tools/harness-runtime/src/images.rs", FACTORY, true)
        .expect("closed factory");
}

#[test]
fn dynamic_raw_constructed_and_second_factory_calls_fail() {
    for replacement in [
        "GenericImage::new(POSTGRES_NAME, tag)",
        "GenericImage::new(r#\"postgres\"#, POSTGRES_TAG)",
        "GenericImage::new(&format!(\"post{}\", \"gres\"), POSTGRES_TAG)",
        "GenericImage::new(POSTGRES_NAME, POSTGRES_TAG); GenericImage::new(POSTGRES_NAME, POSTGRES_TAG)",
    ] {
        let source = FACTORY.replace(
            "GenericImage::new(POSTGRES_NAME, POSTGRES_TAG)",
            replacement,
        );
        assert!(
            validate_testcontainers_source("tools/harness-runtime/src/images.rs", &source, true)
                .is_err()
        );
    }
}

#[test]
fn nested_import_alias_and_type_alias_calls_fail_outside_factory() {
    for source in [
        "mod nested { use testcontainers::{GenericImage as Image}; fn bad() { Image::new(\"redis\", \"7\"); } }",
        "type Image = testcontainers::GenericImage; fn bad() { Image::new(\"redis\", \"7\"); }",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }
}

#[test]
fn comments_docs_and_strings_are_ignored() {
    let source = r#"
/// GenericImage::new("redis", "7")
// use testcontainers::GenericImage as Image;
const TEXT: &str = "GenericImage::new(constructed, tag)";
"#;
    validate_testcontainers_source("crates/domain/src/lib.rs", source, false)
        .expect("non-code text is harmless");
}
