use architecture_validator::intent::{IntentDiff, IntentError, IntentManifest, validate_intents};
use std::path::Path;

#[allow(
    dead_code,
    reason = "documents the original independently reviewed PR stage"
)]
const LEGACY_EXPECTED_PR_STAGE_PATHS: &[&str] = &[
    "Cargo.lock",
    "Cargo.toml",
    "architecture/dependency-policy.toml",
    "architecture/exceptions.toml",
    "architecture/intents/20260711-api-kernel.toml",
    "crates/adapter-aws-cognito/Cargo.toml",
    "crates/adapter-aws-cognito/src/lib.rs",
    "crates/adapter-aws-dynamodb/Cargo.toml",
    "crates/adapter-aws-dynamodb/src/lib.rs",
    "crates/adapter-aws-s3/Cargo.toml",
    "crates/adapter-aws-s3/src/lib.rs",
    "crates/adapter-aws-sqs/Cargo.toml",
    "crates/adapter-aws-sqs/src/lib.rs",
    "crates/adapter-graphql/Cargo.toml",
    "crates/adapter-graphql/src/lib.rs",
    "crates/adapter-postgres/Cargo.toml",
    "crates/adapter-postgres/src/lib.rs",
    "crates/api-bootstrap/Cargo.toml",
    "crates/api-bootstrap/src/bin/api.rs",
    "crates/api-bootstrap/src/bin/migrate.rs",
    "crates/api-bootstrap/src/bin/schema.rs",
    "crates/api-bootstrap/src/bin/track-point-worker.rs",
    "crates/api-bootstrap/src/lib.rs",
    "crates/application/Cargo.toml",
    "crates/application/src/lib.rs",
    "crates/domain/Cargo.toml",
    "crates/domain/src/lib.rs",
    "rust-toolchain.toml",
    "tools/architecture-validator/Cargo.toml",
    "tools/architecture-validator/src/ast.rs",
    "tools/architecture-validator/src/exceptions.rs",
    "tools/architecture-validator/src/intent.rs",
    "tools/architecture-validator/src/lib.rs",
    "tools/architecture-validator/src/main.rs",
    "tools/architecture-validator/src/policy.rs",
    "tools/architecture-validator/tests/exceptions.rs",
    "tools/architecture-validator/tests/fixtures.rs",
    "tools/architecture-validator/tests/intent.rs",
    "tools/architecture-validator/tests/policy.rs",
    "tools/architecture-validator/tests/workspace.rs",
    "tools/harness-runtime/Cargo.toml",
    "tools/harness-runtime/src/lib.rs",
    "tools/integration-test-support/Cargo.toml",
    "tools/integration-test-support/src/lib.rs",
    "tools/xtask/Cargo.toml",
    "tools/xtask/src/main.rs",
];

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
fn independent_diff_artifact_rejects_omitted_actual_and_claimed_unchanged_files() {
    let artifact = r#"version = 1
changed_files = ["Cargo.toml", "crates/domain/src/lib.rs"]
"#;
    let diff = IntentDiff::parse_artifact(artifact).expect("independent diff artifact");
    let omitted = IntentManifest::parse(&intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"]))
        .expect("intent");
    assert!(matches!(
        validate_intents(&[omitted], &diff),
        Err(IntentError::UnownedChangedFile { .. })
    ));

    let claimed = IntentManifest::parse(&intent(
        "API-INTENT-20260711-KERNEL",
        &["Cargo.toml", "crates/domain/src/lib.rs", "README.md"],
    ))
    .expect("intent");
    assert!(matches!(
        validate_intents(&[claimed], &diff),
        Err(IntentError::OwnershipOfUnchangedFile { .. })
    ));
}

#[test]
fn checked_in_diff_artifact_matches_real_pr_base() {
    let api_root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let actual = IntentDiff::from_git(
        &api_root,
        "93db6a3ce552f010db3059f8b130694c1da24774",
        "HEAD",
    )
    .expect("real PR diff");
    let artifact = IntentDiff::parse_artifact(include_str!(
        "../../../architecture/diffs/20260711-api-kernel.toml"
    ))
    .expect("checked-in artifact");
    assert_eq!(actual.changed_files(), artifact.changed_files());
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
fn credential_shapes_are_rejected_without_echoing_values() {
    let credentials = [
        "password : highly-sensitive-value",
        "secret = highly-sensitive-value",
        "Authorization: Bearer highly-sensitive-value",
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123",
        "-----BEGIN PRIVATE KEY-----",
        "AKIAIOSFODNN7EXAMPLE",
        "ghp_123456789012345678901234567890123456",
    ];
    for credential in credentials {
        let source = intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"])
            .replace("API architecture kernel", credential);
        let manifest = IntentManifest::parse(&source).expect("credential is valid TOML text");
        let error = validate_intents(&[manifest], &IntentDiff::new(["Cargo.toml"]))
            .expect_err("credential-like value must be rejected");
        assert!(matches!(error, IntentError::SecretLikeValue { .. }));
        assert!(!format!("{error}").contains(credential));
    }
}

#[test]
fn ordinary_security_language_does_not_trigger_secret_detection() {
    for title in [
        "Validate password policy",
        "Document secret rotation",
        "Support authorization bearer scheme",
        "Reject malformed JWT shape",
        "Parse private key metadata",
    ] {
        let source = intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"])
            .replace("API architecture kernel", title);
        let manifest = IntentManifest::parse(&source).expect("ordinary title parses");
        validate_intents(&[manifest], &IntentDiff::new(["Cargo.toml"]))
            .expect("ordinary security language is not a credential");
    }
}

#[test]
fn owner_and_issue_are_exact_github_references() {
    for (owner, issue) in [
        (
            "github:   ",
            "https://github.com/matsuokashuhei/walking-dog/issues/380",
        ),
        (
            "github:mat su",
            "https://github.com/mat su/walking-dog/issues/380",
        ),
        (
            "github:matsuokashuhei",
            "https://github.com/other/walking-dog/issues/380",
        ),
        (
            "github:matsuokashuhei",
            "https://github.com/matsuokashuhei/walking-dog/issues/0",
        ),
        (
            "github:matsuokashuhei",
            "https://github.com/matsuokashuhei/walking-dog/issues/not-a-number",
        ),
        (
            "github:matsuokashuhei",
            "https://github.com/matsuokashuhei/walking-dog/issues/380/comments",
        ),
    ] {
        let source = intent("API-INTENT-20260711-KERNEL", &["Cargo.toml"])
            .replace("github:matsuokashuhei", owner)
            .replace(
                "https://github.com/matsuokashuhei/walking-dog/issues/380",
                issue,
            );
        let manifest = IntentManifest::parse(&source).expect("references are TOML strings");
        assert!(matches!(
            validate_intents(&[manifest], &IntentDiff::new(["Cargo.toml"])),
            Err(IntentError::InvalidField { .. })
        ));
    }
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
    let diff = IntentDiff::parse_artifact(include_str!(
        "../../../architecture/diffs/20260711-api-kernel.toml"
    ))
    .expect("checked-in diff artifact uses the closed schema");
    let api_root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    for file in diff.changed_files() {
        assert!(
            api_root.join(file).is_file(),
            "expected PR-stage file must exist: {file}"
        );
    }
    validate_intents(&[manifest], &diff).expect("checked-in intent is internally consistent");
}

#[test]
fn checked_in_kernel_intent_rejects_missing_and_extra_ownership() {
    let source = include_str!("../../../architecture/intents/20260711-api-kernel.toml");
    let diff = IntentDiff::parse_artifact(include_str!(
        "../../../architecture/diffs/20260711-api-kernel.toml"
    ))
    .expect("checked-in diff artifact");
    let missing = source.replace("  \"Cargo.lock\",\n", "");
    let manifest = IntentManifest::parse(&missing).expect("modified manifest parses");
    assert!(matches!(
        validate_intents(&[manifest], &diff),
        Err(IntentError::UnownedChangedFile { .. })
    ));

    let extra = source.replace(
        "  \"Cargo.lock\",\n",
        "  \"Cargo.lock\",\n  \"tools/architecture-validator/src/not-changed.rs\",\n",
    );
    let manifest = IntentManifest::parse(&extra).expect("modified manifest parses");
    assert!(matches!(
        validate_intents(&[manifest], &diff),
        Err(IntentError::OwnershipOfUnchangedFile { .. })
    ));
}
