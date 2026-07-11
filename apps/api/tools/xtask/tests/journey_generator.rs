use std::{fs, process::Command};

use tempfile::TempDir;

fn valid_spec(root: &TempDir) -> std::path::PathBuf {
    let path = root.path().join("journey.toml");
    fs::write(
        &path,
        r#"version = 1
application_module = "walk_recording"
kind = "command"
journey = "walk-lifecycle"
graphql_field = "startWalk"
graphql_contract = "mutation"
seams = ["postgres", "sqs"]
failure_categories = ["validation", "conflict", "unavailable"]
"#,
    )
    .unwrap();
    path
}

fn xtask(root: &TempDir, args: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_xtask"))
        .args(args)
        .current_dir(root.path())
        .output()
        .unwrap()
}

#[test]
fn generates_complete_output_and_verifies_it() {
    let root = TempDir::new().unwrap();
    let spec = valid_spec(&root);
    let output = xtask(
        &root,
        &[
            "journey",
            "new",
            "start-walk",
            "--spec",
            spec.to_str().unwrap(),
        ],
    );
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );

    let required = [
        "crates/application/src/walk_recording/start_walk.rs",
        "crates/application/src/walk_recording/contracts/start_walk.rs",
        "crates/adapter-graphql/src/start_walk.rs",
        "crates/adapter-postgres/src/start_walk.rs",
        "crates/application/src/walk_recording/adapters/in_memory_postgres_start_walk.rs",
        "crates/adapter-aws-sqs/src/start_walk.rs",
        "crates/application/src/walk_recording/adapters/in_memory_sqs_start_walk.rs",
        "docs/harness/journeys/generated/start-walk.md",
        "fixtures/observability/start-walk.toml",
        "architecture/manifests/start-walk.toml",
    ];
    for relative in required {
        let contents = fs::read_to_string(root.path().join(relative))
            .unwrap_or_else(|_| panic!("missing {relative}"));
        assert!(
            contents.contains("@generated journey-generator:v1"),
            "marker missing in {relative}"
        );
        assert!(
            !contents.contains("TODO")
                && !contents.contains("TBD")
                && !contents.contains("unimplemented!")
        );
    }
    assert!(
        xtask(&root, &["journey", "verify-generated"])
            .status
            .success()
    );

    fs::remove_file(
        root.path()
            .join("crates/adapter-postgres/src/start_walk.rs"),
    )
    .unwrap();
    assert!(
        !xtask(&root, &["journey", "verify-generated"])
            .status
            .success()
    );

    let root = TempDir::new().unwrap();
    let spec = valid_spec(&root);
    assert!(
        xtask(
            &root,
            &[
                "journey",
                "new",
                "start-walk",
                "--spec",
                spec.to_str().unwrap(),
            ],
        )
        .status
        .success()
    );
    fs::remove_file(root.path().join("architecture/manifests/start-walk.toml")).unwrap();
    assert!(
        !xtask(&root, &["journey", "verify-generated"])
            .status
            .success()
    );
}

#[test]
fn invalid_registry_value_and_collision_are_atomic() {
    let root = TempDir::new().unwrap();
    let spec = valid_spec(&root);
    let collision = root
        .path()
        .join("crates/application/src/walk_recording/start_walk.rs");
    fs::create_dir_all(collision.parent().unwrap()).unwrap();
    fs::write(&collision, "owned\n").unwrap();

    let output = xtask(
        &root,
        &[
            "journey",
            "new",
            "start-walk",
            "--spec",
            spec.to_str().unwrap(),
        ],
    );
    assert!(!output.status.success());
    assert_eq!(fs::read_to_string(&collision).unwrap(), "owned\n");
    assert!(
        !root
            .path()
            .join("architecture/manifests/start-walk.toml")
            .exists()
    );

    fs::remove_file(&collision).unwrap();
    fs::write(
        &spec,
        fs::read_to_string(&spec)
            .unwrap()
            .replace("walk_recording", "unknown"),
    )
    .unwrap();
    let output = xtask(
        &root,
        &[
            "journey",
            "new",
            "start-walk",
            "--spec",
            spec.to_str().unwrap(),
        ],
    );
    assert!(!output.status.success());
    assert_eq!(
        fs::read_dir(root.path().join("crates/application/src/walk_recording"))
            .unwrap()
            .count(),
        0
    );
}
