use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

const EXPECTED_MEMBERS: [&str; 13] = [
    "crates/adapter-aws-cognito",
    "crates/adapter-aws-dynamodb",
    "crates/adapter-aws-s3",
    "crates/adapter-aws-sqs",
    "crates/adapter-graphql",
    "crates/adapter-postgres",
    "crates/api-bootstrap",
    "crates/application",
    "crates/domain",
    "tools/architecture-validator",
    "tools/harness-runtime",
    "tools/integration-test-support",
    "tools/xtask",
];

fn api_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("architecture-validator must live under apps/api/tools")
        .to_path_buf()
}

fn workspace_members(manifest: &str) -> BTreeSet<String> {
    let workspace = manifest
        .split("[workspace]")
        .nth(1)
        .expect("workspace table");
    let members = workspace
        .split("members")
        .nth(1)
        .expect("workspace members");
    let list = members
        .split_once('[')
        .and_then(|(_, value)| value.split_once(']'))
        .map(|(value, _)| value)
        .expect("workspace members array");

    list.split(',')
        .map(str::trim)
        .filter(|member| !member.is_empty())
        .map(|member| member.trim_matches('"').to_owned())
        .collect()
}

#[test]
fn workspace_matches_the_api_kernel() {
    let root = api_root();
    let manifest = fs::read_to_string(root.join("Cargo.toml")).expect("read workspace manifest");
    assert!(
        !manifest.lines().any(|line| line.trim() == "[package]"),
        "apps/api/Cargo.toml must be a virtual workspace"
    );
    assert!(manifest.contains("edition = \"2024\""));

    let actual = workspace_members(&manifest);
    let expected = EXPECTED_MEMBERS
        .into_iter()
        .map(str::to_owned)
        .collect::<BTreeSet<_>>();
    assert_eq!(actual, expected, "workspace member set must be exact");

    let toolchain = fs::read_to_string(root.join("rust-toolchain.toml"))
        .expect("read pinned Rust toolchain");
    assert!(toolchain.contains("channel = \"1.96.0\""));
    assert!(toolchain.contains("components = [\"clippy\", \"rustfmt\"]"));

    for legacy in ["src", "migration", "sqs-consumer"] {
        assert!(
            !root.join(legacy).exists(),
            "legacy path must be absent: {legacy}"
        );
    }
}
