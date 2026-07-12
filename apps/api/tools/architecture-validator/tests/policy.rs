use architecture_validator::policy::{
    DependencyKind, Policy, PolicyError, WorkspaceEdge, validate_edges, validate_metadata,
    validate_testcontainers_dependency_names,
};
use cargo_metadata::MetadataCommand;
use std::fs;
use std::path::Path;

const POLICY: &str = r#"
version = 1
default = "deny"

[workspace_edges.normal]
domain = []
application = ["domain"]
adapter-graphql = ["application", "domain"]

[workspace_edges.dev]
domain = []
application = []
adapter-graphql = ["integration-test-support"]

[workspace_edges.build]
domain = []
application = []
adapter-graphql = []
"#;

#[test]
fn exact_allowed_edge_passes() {
    let policy = Policy::parse(POLICY).expect("valid policy");
    let diagnostics = validate_edges(
        &policy,
        &[WorkspaceEdge {
            from: "application",
            to: "domain",
            kind: DependencyKind::Normal,
        }],
    )
    .expect("known graph");

    assert!(diagnostics.is_empty());
}

#[test]
fn dev_allowance_never_authorizes_normal_dependency() {
    let policy = Policy::parse(POLICY).expect("valid policy");
    let diagnostics = validate_edges(
        &policy,
        &[WorkspaceEdge {
            from: "adapter-graphql",
            to: "integration-test-support",
            kind: DependencyKind::Normal,
        }],
    )
    .expect("known graph");

    assert_eq!(diagnostics.len(), 1);
    assert_eq!(diagnostics[0].rule_id, "API-DEP-001");
    assert_eq!(diagnostics[0].from, "adapter-graphql");
    assert_eq!(diagnostics[0].to, "integration-test-support");
    assert_eq!(diagnostics[0].kind, DependencyKind::Normal);
}

#[test]
fn unknown_workspace_crate_fails_closed() {
    let policy = Policy::parse(POLICY).expect("valid policy");
    let result = validate_edges(
        &policy,
        &[WorkspaceEdge {
            from: "unknown-crate",
            to: "domain",
            kind: DependencyKind::Normal,
        }],
    );

    assert!(matches!(
        result,
        Err(PolicyError::UnknownWorkspaceCrate { name }) if name == "unknown-crate"
    ));
}

#[test]
fn invalid_default_is_rejected() {
    let invalid = POLICY.replace("default = \"deny\"", "default = \"allow\"");
    let result = Policy::parse(&invalid);

    assert!(matches!(result, Err(PolicyError::InvalidDefault(value)) if value == "allow"));
}

#[test]
fn checked_in_policy_accepts_the_locked_resolved_workspace() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("architecture-validator must live under apps/api/tools");
    let source = fs::read_to_string(root.join("architecture/dependency-policy.toml"))
        .expect("read checked-in dependency policy");
    let policy = Policy::parse(&source).expect("checked-in policy is valid");
    let metadata = MetadataCommand::new()
        .manifest_path(root.join("Cargo.toml"))
        .other_options(vec!["--locked".to_owned()])
        .exec()
        .expect("locked cargo metadata");

    assert!(
        validate_metadata(&policy, &metadata)
            .expect("closed workspace registry")
            .is_empty()
    );
}

#[test]
fn renamed_testcontainers_dependencies_fail_closed_in_every_dependency_table() {
    for heading in [
        "dependencies",
        "dev-dependencies",
        "build-dependencies",
        "target.'cfg(unix)'.dependencies",
        "workspace.dependencies",
    ] {
        let manifest =
            format!("[{heading}]\ntc = {{ package = \"testcontainers\", version = \"0.23\" }}\n");
        assert!(validate_testcontainers_dependency_names("Cargo.toml", &manifest).is_err());
    }

    validate_testcontainers_dependency_names(
        "Cargo.toml",
        "[dependencies]\ntestcontainers = \"0.23\"\n",
    )
    .expect("canonical dependency key is allowed");
}
