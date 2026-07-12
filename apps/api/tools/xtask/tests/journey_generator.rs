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

fn xtask_with_env(root: &TempDir, key: &str, value: &str, args: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_xtask"))
        .args(args)
        .env(key, value)
        .current_dir(root.path())
        .output()
        .unwrap()
}

fn workspace_files(root: &TempDir) -> Vec<(String, Vec<u8>)> {
    fn visit(base: &std::path::Path, path: &std::path::Path, out: &mut Vec<(String, Vec<u8>)>) {
        for entry in fs::read_dir(path).unwrap() {
            let path = entry.unwrap().path();
            if path.is_dir() {
                visit(base, &path, out);
            } else {
                out.push((
                    path.strip_prefix(base)
                        .unwrap()
                        .to_string_lossy()
                        .into_owned(),
                    fs::read(path).unwrap(),
                ));
            }
        }
    }
    let mut files = Vec::new();
    visit(root.path(), root.path(), &mut files);
    files.sort_by(|left, right| left.0.cmp(&right.0));
    files
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
        "architecture/manifest.toml",
    ];
    for relative in required {
        let contents = fs::read_to_string(
            root.path()
                .join("generated/journeys/start-walk/artifacts")
                .join(relative),
        )
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
        root.path().join(
            "generated/journeys/start-walk/artifacts/crates/adapter-postgres/src/start_walk.rs",
        ),
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
    fs::remove_file(
        root.path()
            .join("generated/journeys/start-walk/artifacts/architecture/manifest.toml"),
    )
    .unwrap();
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
        .join("generated/journeys/start-walk/racing-owner.txt");
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
            .join("architecture/generated-journeys.toml")
            .exists()
    );

    fs::remove_dir_all(root.path().join("generated/journeys/start-walk")).unwrap();
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
    assert!(!root.path().join("generated/journeys/start-walk").exists());
}

#[test]
fn placement_failure_rolls_back_every_published_file() {
    let root = TempDir::new().unwrap();
    let spec = valid_spec(&root);
    let before = workspace_files(&root);
    let output = xtask_with_env(
        &root,
        "XTASK_TEST_FAIL_AFTER_PLACEMENTS",
        "2",
        &[
            "journey",
            "new",
            "start-walk",
            "--spec",
            spec.to_str().unwrap(),
        ],
    );
    assert!(!output.status.success());
    assert_eq!(workspace_files(&root), before);
}

#[test]
fn index_write_and_sync_failures_restore_exact_workspace() {
    for fault in ["write", "sync"] {
        let root = TempDir::new().unwrap();
        let spec = valid_spec(&root);
        let before = workspace_files(&root);
        let output = xtask_with_env(
            &root,
            "XTASK_TEST_INDEX_FAILURE",
            fault,
            &[
                "journey",
                "new",
                "start-walk",
                "--spec",
                spec.to_str().unwrap(),
            ],
        );
        assert!(
            !output.status.success(),
            "fault {fault} unexpectedly succeeded"
        );
        assert_eq!(
            workspace_files(&root),
            before,
            "fault {fault} changed workspace"
        );
    }
}

#[test]
fn appends_second_use_case_and_rejects_duplicate_unchanged() {
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
                spec.to_str().unwrap()
            ]
        )
        .status
        .success()
    );
    assert!(
        xtask(
            &root,
            &[
                "journey",
                "new",
                "finish-walk",
                "--spec",
                spec.to_str().unwrap()
            ]
        )
        .status
        .success()
    );
    let index =
        fs::read_to_string(root.path().join("architecture/generated-journeys.toml")).unwrap();
    assert!(index.contains("start-walk") && index.contains("finish-walk"));
    assert!(
        xtask(&root, &["journey", "verify-generated"])
            .status
            .success()
    );

    let before = workspace_files(&root);
    assert!(
        !xtask(
            &root,
            &[
                "journey",
                "new",
                "finish-walk",
                "--spec",
                spec.to_str().unwrap()
            ]
        )
        .status
        .success()
    );
    assert_eq!(workspace_files(&root), before);
}

#[test]
fn raced_index_is_preserved_and_new_artifacts_are_rolled_back() {
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
                spec.to_str().unwrap()
            ]
        )
        .status
        .success()
    );
    let output = xtask_with_env(
        &root,
        "XTASK_TEST_RACE_INDEX",
        "concurrent-owner",
        &[
            "journey",
            "new",
            "finish-walk",
            "--spec",
            spec.to_str().unwrap(),
        ],
    );
    assert!(!output.status.success());
    assert!(
        fs::read_to_string(root.path().join("architecture/generated-journeys.toml"))
            .unwrap()
            .contains("concurrent-owner")
    );
    assert!(!root.path().join("generated/journeys/finish-walk").exists());
}

#[test]
fn destination_created_after_preflight_is_not_overwritten() {
    let root = TempDir::new().unwrap();
    let spec = valid_spec(&root);
    let output = xtask_with_env(
        &root,
        "XTASK_TEST_RACE_DESTINATION",
        "crates/adapter-graphql/src/start_walk.rs",
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
        fs::read_to_string(
            root.path()
                .join("generated/journeys/start-walk/crates/adapter-graphql/src/start_walk.rs")
        )
        .unwrap(),
        "racing owner\n"
    );
    assert!(
        !root
            .path()
            .join("generated/journeys/start-walk/artifacts")
            .exists()
    );
}

#[test]
fn independent_index_rejects_total_artifact_deletion() {
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
                spec.to_str().unwrap()
            ]
        )
        .status
        .success()
    );
    let destination = root.path().join("generated/journeys/start-walk/artifacts");
    let manifest = fs::read_to_string(destination.join("architecture/manifest.toml")).unwrap();
    let parsed: toml::Value = toml::from_str(&manifest).unwrap();
    for file in parsed["files"].as_array().unwrap() {
        fs::remove_file(destination.join(file["path"].as_str().unwrap())).unwrap();
    }
    fs::remove_file(destination.join("architecture/manifest.toml")).unwrap();
    assert!(
        root.path()
            .join("architecture/generated-journeys.toml")
            .exists()
    );
    assert!(
        !xtask(&root, &["journey", "verify-generated"])
            .status
            .success()
    );
}
