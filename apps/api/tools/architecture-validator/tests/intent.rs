use architecture_validator::intent::{IntentDiff, IntentError, IntentManifest, validate_intents};
use std::path::Path;

fn intent(id: &str, owned_files: &[&str]) -> String {
    let files = owned_files
        .iter()
        .map(|file| format!(r#""{file}""#))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        r#"
version = 1
id = "{id}"
title = "API architecture kernel"
change_kind = "architecture"
owner = "github:matsuokashuhei"
issue = "https://github.com/matsuokashuhei/walking-dog/issues/380"
product_axes = ["dog_experience", "walk_data", "owner_contribution"]
canonical_journeys = []
application_modules = []
touched_seams = []
schema_impact = "none"
data_migration_impact = "none"
expected_failure_modes = ["validation_failure"]
required_evidence = ["architecture_validator"]
owned_files = [{files}]
"#
    )
}

#[test]
fn architecture_intent_exactly_owns_its_changed_files() {
    let manifest = IntentManifest::parse(&intent(
        "API-INTENT-20260711-KERNEL",
        &["tools/architecture-validator/src/intent.rs"],
    ))
    .expect("closed intent parses");
    let diff = IntentDiff::new(["tools/architecture-validator/src/intent.rs"]);

    validate_intents(&[manifest], &diff).expect("ownership matches in both directions");
}

#[test]
fn schema_and_registries_fail_closed() {
    let unknown_field = format!(
        "{}\ncompatibility_alias = \"legacy\"\n",
        intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"])
    );
    assert!(matches!(
        IntentManifest::parse(&unknown_field),
        Err(IntentError::Parse(_))
    ));

    for (field, invalid) in [
        ("change_kind", "legacy"),
        ("schema_impact", "risky"),
        ("data_migration_impact", "automatic"),
    ] {
        let source = intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"])
            .replace(
                &format!(r#"{field} = \"none\""#),
                &format!(r#"{field} = \"{invalid}\""#),
            )
            .replace(
                "change_kind = \"architecture\"",
                &format!(r#"change_kind = \"{invalid}\""#),
            );
        assert!(matches!(
            IntentManifest::parse(&source),
            Err(IntentError::Parse(_))
        ));
    }
}

#[test]
fn empty_unknown_duplicate_secret_and_architecture_journey_values_are_rejected() {
    let unknown_registry = intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"])
        .replace("dog_experience", "unknown_axis");
    assert!(matches!(
        IntentManifest::parse(&unknown_registry),
        Err(IntentError::Parse(_))
    ));

    let cases = [
        intent("", &["Cargo.toml"]),
        intent("API-INTENT-20260711-KERNEL", &[""]),
        intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"]).replace(
            "canonical_journeys = []",
            "canonical_journeys = [\"walk_lifecycle\"]",
        ),
        intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"])
            .replace("API architecture kernel", "token=ghp_12345678901234567890"),
    ];
    for source in cases {
        let manifest = IntentManifest::parse(&source).expect("syntactically valid intent");
        assert!(validate_intents(&[manifest], &IntentDiff::new(["Cargo.toml"])).is_err());
    }

    let first = IntentManifest::parse(&intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"]))
        .expect("valid first intent");
    let duplicate = first.clone();
    assert!(matches!(
        validate_intents(&[first, duplicate], &IntentDiff::new(["Cargo.toml"])),
        Err(IntentError::DuplicateId { .. })
    ));
}

#[test]
fn ownership_must_be_exact_non_overlapping_and_bidirectional() {
    let first = IntentManifest::parse(&intent("API-INTENT-20260711-FIRST", &["Cargo.toml"]))
        .expect("valid first intent");
    let second = IntentManifest::parse(&intent("API-INTENT-20260711-SECOND", &["Cargo.toml"]))
        .expect("valid second intent");
    assert!(matches!(
        validate_intents(&[first, second], &IntentDiff::new(["Cargo.toml"])),
        Err(IntentError::OverlappingOwnership { .. })
    ));

    let manifest = IntentManifest::parse(&intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"]))
        .expect("valid intent");
    assert!(matches!(
        validate_intents(
            std::slice::from_ref(&manifest),
            &IntentDiff::new(["src/lib.rs"])
        ),
        Err(IntentError::OwnershipOfUnchangedFile { .. })
    ));
    assert!(matches!(
        validate_intents(&[manifest], &IntentDiff::new(["Cargo.toml", "src/lib.rs"])),
        Err(IntentError::UnownedChangedFile { .. })
    ));
}

#[test]
fn adapter_changes_require_a_named_seam_and_integration_evidence() {
    let manifest = IntentManifest::parse(&intent(
        "API-INTENT-20260711-KERNEL",
        &["crates/adapter-graphql/src/lib.rs"],
    ))
    .expect("valid intent");

    assert!(matches!(
        validate_intents(
            &[manifest],
            &IntentDiff::new(["crates/adapter-graphql/src/lib.rs"])
        ),
        Err(IntentError::AdapterDeclarationMissing { .. })
    ));
}

#[test]
fn checked_in_kernel_intent_owns_only_existing_kernel_files_and_no_journey() {
    let source = include_str!("../../../architecture/intents/20260711-api-kernel.toml");
    let manifest = IntentManifest::parse(source).expect("checked-in intent uses the closed schema");
    let api_root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    for file in manifest.owned_files() {
        assert!(
            api_root.join(file).is_file(),
            "owned file must exist: {file}"
        );
    }
    let diff = IntentDiff::new(manifest.owned_files().iter().cloned());
    validate_intents(&[manifest], &diff).expect("checked-in intent is internally consistent");
}
