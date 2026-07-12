use std::fs;

#[test]
fn catalog_generation_is_deterministic_and_opaque() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir_all(root.path().join("architecture")).unwrap();
    fs::write(
        root.path().join("architecture/test-images.json"),
        r#"{"version":1,"postgres":{"name":"postgres","tag":"16-alpine","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}"#,
    )
    .unwrap();
    xtask::image_catalog::generate(root.path()).unwrap();
    let generated = fs::read_to_string(
        root.path()
            .join("tools/harness-runtime/src/generated_postgres.rs"),
    )
    .unwrap();
    assert!(generated.contains("@generated image-catalog:v1"));
    assert!(!generated.contains("pub struct GenericImage"));
    xtask::image_catalog::verify(root.path()).unwrap();
    let first = generated;
    xtask::image_catalog::generate(root.path()).unwrap();
    assert_eq!(
        first,
        fs::read_to_string(
            root.path()
                .join("tools/harness-runtime/src/generated_postgres.rs")
        )
        .unwrap()
    );
    fs::write(
        root.path()
            .join("tools/harness-runtime/src/generated_postgres.rs"),
        "drift",
    )
    .unwrap();
    assert!(xtask::image_catalog::verify(root.path()).is_err());
}

#[test]
fn catalog_rejects_malformed_digests_and_unknown_fields() {
    for catalog in [
        r#"{"version":1,"postgres":{"name":"postgres","tag":"16","digest":"sha256:ABC"}}"#,
        r#"{"version":1,"postgres":{"name":"postgres","tag":"16","digest":"sha256:ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg"}}"#,
        r#"{"version":1,"postgres":{"name":"postgres","tag":"16","digest":"sha256:abc","extra":true}}"#,
        r#"{"version":1,"postgres":{"name":"post\"gres","tag":"16","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}"#,
        r#"{"version":1,"postgres":{"name":"postgres","tag":"16"}}"#,
    ] {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir_all(root.path().join("architecture")).unwrap();
        fs::write(root.path().join("architecture/test-images.json"), catalog).unwrap();
        assert!(xtask::image_catalog::generate(root.path()).is_err());
    }
}
