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

#[test]
fn constructor_function_items_and_macro_forwarding_fail() {
    for source in [
        "use testcontainers::GenericImage; fn bad() { let constructor = GenericImage::new; let _ = constructor; }",
        "use testcontainers::GenericImage; fn bad() { let constructor = || GenericImage::new; let _ = constructor; }",
        "use testcontainers::GenericImage; macro_rules! forward { ($value:path) => { $value } } fn bad() { let _ = forward!(GenericImage::new); }",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }
}

#[test]
fn factory_macros_and_constructor_references_fail() {
    for addition in [
        "fn reference() { let _ = GenericImage::new; }",
        "macro_rules! make { () => { GenericImage::new(POSTGRES_NAME, POSTGRES_TAG) } }",
        "fn make() { let _ = identity!(GenericImage::new); }",
    ] {
        assert!(
            validate_testcontainers_source(
                "tools/harness-runtime/src/images.rs",
                &format!("{FACTORY}\n{addition}"),
                true,
            )
            .is_err()
        );
    }
}

#[test]
fn aliases_are_fixed_point_order_independent_and_scope_local() {
    let chained = "type Final = Middle; type Middle = testcontainers::GenericImage; fn bad() { Final::new(\"redis\", \"7\"); }";
    assert!(validate_testcontainers_source("crates/domain/src/lib.rs", chained, false).is_err());

    let siblings = r"
mod first { use testcontainers::GenericImage as Image; }
mod second { struct Image; impl Image { fn new() {} } fn clean() { Image::new(); } }
";
    validate_testcontainers_source("crates/domain/src/lib.rs", siblings, false)
        .expect("canonical alias does not leak to sibling scope");
}

#[test]
fn unrelated_generic_image_names_are_clean() {
    for source in [
        "struct GenericImage; impl GenericImage { fn new() {} } fn clean() { GenericImage::new(); }",
        "use my_images::GenericImage; fn clean() { GenericImage::new(); }",
        "use testcontainers::GenericImage; fn clean() { struct GenericImage; impl GenericImage { fn new() {} } GenericImage::new(); }",
    ] {
        validate_testcontainers_source("crates/domain/src/lib.rs", source, false)
            .expect("unrelated provenance is clean");
    }
}

#[test]
fn crate_and_reexport_alias_chains_are_canonical() {
    for source in [
        "use testcontainers as tc; use tc::GenericImage as First; use First as Final; fn bad() { Final::new(\"redis\", \"7\"); }",
        "pub use testcontainers::GenericImage as Image; mod child { use super::Image as ChildImage; fn bad() { ChildImage::new(\"redis\", \"7\"); } }",
        "pub use testcontainers::GenericImage as Image; fn bad() { crate::Image::new(\"redis\", \"7\"); self::Image::new(\"redis\", \"7\"); }",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }
}

#[test]
fn macro_substitution_cannot_assemble_a_constructor() {
    for source in [
        "macro_rules! construct { ($image:path) => { $image::new(\"redis\", \"7\") } }",
        "use testcontainers as tc; invoke!(tc::GenericImage);",
        "use testcontainers::GenericImage as Image; invoke!(Image);",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }

    validate_testcontainers_source(
        "crates/domain/src/lib.rs",
        "macro_rules! log_value { ($value:expr) => { println!(\"{}\", $value) } } fn clean() { log_value!(1); }",
        false,
    )
    .expect("ordinary macros remain clean");
}

#[test]
fn noncanonical_type_namespace_bindings_shadow_canonical_names() {
    for source in [
        "use testcontainers::GenericImage as Image; fn clean() { type Image = Local; struct Local; impl Local { fn new() {} } Image::new(); }",
        "use testcontainers::GenericImage as Image; fn clean() { use local::Image; Image::new(); }",
        "use testcontainers::GenericImage as Image; fn clean() { union Image { value: u8 } impl Image { fn new() {} } Image::new(); }",
    ] {
        validate_testcontainers_source("crates/domain/src/lib.rs", source, false)
            .expect("local noncanonical type binding shadows the canonical name");
    }
}
