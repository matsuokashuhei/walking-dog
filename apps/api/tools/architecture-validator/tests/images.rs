use architecture_validator::images::{
    validate_testcontainers_source, validate_testcontainers_source_set,
};

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

#[test]
fn module_reexports_propagate_canonical_provenance() {
    for source in [
        "mod shim { pub use testcontainers::GenericImage; } fn bad() { shim::GenericImage::new(\"redis\", \"7\"); }",
        "mod shim { pub use testcontainers::GenericImage as Image; } use shim::Image as Final; fn bad() { Final::new(\"redis\", \"7\"); }",
        "mod shim { pub use testcontainers::GenericImage as Image; } mod nested { fn bad() { crate::shim::Image::new(\"redis\", \"7\"); } }",
        "mod parent { pub mod shim { pub use testcontainers::GenericImage as Image; } pub mod child { use super::shim::Image as Final; fn bad() { self::Final::new(\"redis\", \"7\"); } } }",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }
}

#[test]
fn noncanonical_sibling_module_export_is_clean() {
    let source = "mod canonical { pub use testcontainers::GenericImage as Image; } mod local { pub struct Image; impl Image { pub fn new() {} } } fn clean() { local::Image::new(); }";
    validate_testcontainers_source("crates/domain/src/lib.rs", source, false)
        .expect("qualified provenance does not leak across sibling modules");
}

#[test]
fn cross_file_reexports_are_indexed_with_restricted_visibility() {
    let sources = [
        (
            "crates/domain/src/lib.rs",
            "mod shim; use shim::Image as Final; fn bad() { Final::new(\"redis\", \"7\"); }",
        ),
        (
            "crates/domain/src/shim.rs",
            "pub(crate) use testcontainers::GenericImage as Image;",
        ),
    ];
    assert!(validate_testcontainers_source_set(&sources).is_err());

    let super_sources = [
        (
            "crates/domain/src/lib.rs",
            "mod parent; fn bad() { parent::Image::new(\"redis\", \"7\"); }",
        ),
        (
            "crates/domain/src/parent.rs",
            "pub(super) use testcontainers::GenericImage as Image;",
        ),
    ];
    assert!(validate_testcontainers_source_set(&super_sources).is_err());
}

#[test]
fn source_set_exports_do_not_cross_target_boundaries() {
    let sources = [
        (
            "crates/domain/src/lib.rs",
            "mod helper { pub struct Image; impl Image { pub fn new() {} } } fn clean() { helper::Image::new(); }",
        ),
        (
            "crates/domain/tests/helper.rs",
            "pub use testcontainers::GenericImage as Image;",
        ),
    ];
    validate_testcontainers_source_set(&sources).expect("test exports do not pollute the library");
}

#[test]
fn local_shadow_precedes_qualified_export_lookup() {
    let source = "pub use testcontainers::GenericImage as Image; fn clean() { type Image = Local; struct Local; impl Local { fn new() {} } Image::new(); }";
    validate_testcontainers_source("crates/domain/src/lib.rs", source, false)
        .expect("local type alias shadows the root export index");
}

#[test]
fn canonical_glob_imports_fail_closed() {
    for source in [
        "use testcontainers::*; fn bad() { GenericImage::new(\"redis\", \"7\"); }",
        "use testcontainers::*;",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }

    let sources = [
        ("crates/domain/src/lib.rs", "mod shim; use shim::*;"),
        ("crates/domain/src/shim.rs", "pub use testcontainers::*;"),
    ];
    assert!(validate_testcontainers_source_set(&sources).is_err());
}

#[test]
fn extern_crate_alias_is_canonical() {
    let source =
        "extern crate testcontainers as tc; fn bad() { tc::GenericImage::new(\"redis\", \"7\"); }";
    assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
}

#[test]
fn nested_binary_modules_use_target_relative_paths() {
    let sources = [
        (
            "crates/tool/src/bin/runner/main.rs",
            "mod shim; fn bad() { crate::shim::Image::new(\"redis\", \"7\"); }",
        ),
        (
            "crates/tool/src/bin/runner/shim.rs",
            "pub(crate) use testcontainers::GenericImage as Image;",
        ),
    ];
    assert!(validate_testcontainers_source_set(&sources).is_err());
}

#[test]
fn local_testcontainers_modules_shadow_the_extern_prelude() {
    let inline = "mod testcontainers { pub struct GenericImage; impl GenericImage { pub fn new() {} } } fn clean() { testcontainers::GenericImage::new(); }";
    validate_testcontainers_source("crates/domain/src/lib.rs", inline, false)
        .expect("inline local module is noncanonical");

    let split = [
        (
            "crates/domain/src/lib.rs",
            "mod testcontainers; fn clean() { testcontainers::GenericImage::new(); }",
        ),
        (
            "crates/domain/src/testcontainers.rs",
            "pub struct GenericImage; impl GenericImage { pub fn new() {} }",
        ),
    ];
    validate_testcontainers_source_set(&split).expect("file module is noncanonical");
}

#[test]
fn explicit_external_testcontainers_paths_remain_canonical() {
    for source in [
        "fn bad() { ::testcontainers::GenericImage::new(\"redis\", \"7\"); }",
        "extern crate testcontainers as tc; fn bad() { tc::GenericImage::new(\"redis\", \"7\"); }",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }
}

#[test]
fn absolute_use_provenance_survives_alias_chains() {
    for source in [
        "mod testcontainers { pub struct GenericImage; } use ::testcontainers::GenericImage as ExternalImage; fn bad() { ExternalImage::new(\"redis\", \"7\"); }",
        "mod testcontainers { pub struct GenericImage; } use ::testcontainers::GenericImage as First; use First as Final; fn bad() { Final::new(\"redis\", \"7\"); }",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }
}

#[test]
fn absolute_cross_file_reexports_remain_canonical() {
    let sources = [
        (
            "crates/domain/src/lib.rs",
            "mod testcontainers; mod shim; use shim::Image as Final; fn bad() { Final::new(\"redis\", \"7\"); }",
        ),
        (
            "crates/domain/src/testcontainers.rs",
            "pub struct GenericImage;",
        ),
        (
            "crates/domain/src/shim.rs",
            "pub use ::testcontainers::GenericImage as Image;",
        ),
    ];
    assert!(validate_testcontainers_source_set(&sources).is_err());
}

#[test]
fn local_module_reexport_without_absolute_prefix_is_clean() {
    let source = "mod testcontainers { pub struct GenericImage; impl GenericImage { pub fn new() {} } } pub use testcontainers::GenericImage as Image; fn clean() { Image::new(); }";
    validate_testcontainers_source("crates/domain/src/lib.rs", source, false)
        .expect("local reexport stays noncanonical");
}

#[test]
fn cross_file_canonical_module_alias_exports_are_resolved() {
    for root in [
        "pub(crate) use ::testcontainers as tc; mod child;",
        "pub extern crate testcontainers as tc; mod child;",
        "pub use ::testcontainers as first; pub(super) use first as tc; mod child;",
    ] {
        let sources = [
            ("crates/domain/src/lib.rs", root),
            (
                "crates/domain/src/child.rs",
                "fn bad() { crate::tc::GenericImage::new(\"redis\", \"7\"); }",
            ),
        ];
        assert!(validate_testcontainers_source_set(&sources).is_err());
    }
}

#[test]
fn local_module_alias_export_stays_noncanonical_across_files() {
    let sources = [
        (
            "crates/domain/src/lib.rs",
            "mod testcontainers; pub use testcontainers as tc; mod child;",
        ),
        (
            "crates/domain/src/testcontainers.rs",
            "pub struct GenericImage; impl GenericImage { pub fn new() {} }",
        ),
        (
            "crates/domain/src/child.rs",
            "fn clean() { crate::tc::GenericImage::new(); }",
        ),
    ];
    validate_testcontainers_source_set(&sources).expect("local module capability is not canonical");
}

#[test]
fn macro_arguments_resolve_cross_file_canonical_exports() {
    for (root, child) in [
        (
            "pub(crate) use ::testcontainers as first; pub(super) use first as tc; mod child;",
            "make!(crate::tc::GenericImage);",
        ),
        ("mod shim; mod child;", "invoke!(crate::shim::Image);"),
    ] {
        let sources = [
            ("crates/domain/src/lib.rs", root),
            ("crates/domain/src/child.rs", child),
            (
                "crates/domain/src/shim.rs",
                "pub(crate) use ::testcontainers::GenericImage as Image;",
            ),
        ];
        assert!(validate_testcontainers_source_set(&sources).is_err());
    }
}

#[test]
fn macro_arguments_with_local_exports_are_clean() {
    let sources = [
        (
            "crates/domain/src/lib.rs",
            "mod testcontainers; pub use testcontainers as tc; mod child;",
        ),
        (
            "crates/domain/src/testcontainers.rs",
            "pub struct GenericImage;",
        ),
        (
            "crates/domain/src/child.rs",
            "inspect!(crate::tc::GenericImage);",
        ),
    ];
    validate_testcontainers_source_set(&sources).expect("local macro argument is noncanonical");
}

#[test]
fn production_rust_includes_fail_closed() {
    for source in [
        "include!(\"generated.inc\");",
        "include!(\"generated.rs\");",
        "include!(concat!(env!(\"OUT_DIR\"), \"/generated.rs\"));",
    ] {
        assert!(validate_testcontainers_source("crates/domain/src/lib.rs", source, false).is_err());
    }

    let sources = [
        ("crates/domain/src/lib.rs", "include!(\"generated.inc\");"),
        (
            "crates/domain/src/generated.inc",
            "testcontainers::GenericImage::new(\"redis\", \"7\");",
        ),
    ];
    assert!(validate_testcontainers_source_set(&sources).is_err());
}

#[test]
fn non_rust_includes_and_text_are_clean() {
    for source in [
        "const BYTES: &[u8] = include_bytes!(\"fixture.bin\");",
        "const TEXT: &str = \"include!(\\\"generated.rs\\\")\"; // include!(\"ignored.rs\")",
    ] {
        validate_testcontainers_source("crates/domain/src/lib.rs", source, false)
            .expect("non-token include content is harmless");
    }
    validate_testcontainers_source(
        "crates/domain/tests/fixture.rs",
        "include!(\"test_support.rs\");",
        false,
    )
    .expect("non-production test target may include Rust support");
}
