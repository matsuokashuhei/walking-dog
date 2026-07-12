use std::fs;
use std::process::Command;

use architecture_validator::check::{
    OutputFormat, check_workspace, diagnostic_fingerprint, render_diagnostics,
    unsuppressed_diagnostics,
};
use architecture_validator::exceptions::ExceptionSet;

#[test]
fn workspace_check_discovers_unreachable_rust_and_reports_complete_human_diagnostic() {
    let root = tempfile::tempdir().expect("temporary workspace");
    fs::create_dir_all(root.path().join("crates/domain/src")).expect("source directory");
    fs::write(
        root.path().join("crates/domain/src/unreachable.rs"),
        "pub fn secret() { tracing::info!(access_token = token); }\n",
    )
    .expect("unreachable source");

    let outcome = check_workspace(root.path(), false).expect("workspace source check");
    let output =
        render_diagnostics(&outcome.diagnostics, OutputFormat::Human).expect("human output");

    assert!(output.contains("API-ARCH-012"));
    assert!(output.contains("crates/domain/src/unreachable.rs:1"));
    assert!(output.contains("tracing::info!"));
    assert!(output.contains("permitted destination"));
    assert!(output.contains("guidance"));
}

#[test]
fn exact_exception_suppresses_only_its_stable_fingerprint() {
    let diagnostic = architecture_validator::ast::Diagnostic {
        rule_id: "API-ARCH-001",
        path: "crates/domain/src/lib.rs".to_owned(),
        line: 3,
        symbol: "std::env::var(\"PORT\")".to_owned(),
        guidance: "inject typed configuration from api-bootstrap",
    };
    let fingerprint = diagnostic_fingerprint("domain", &diagnostic);
    let source = format!(
        r#"version = 1
[[exception]]
id = "API-EXC-0001"
rule = "API-ARCH-001"
crate = "domain"
file = "crates/domain/src/lib.rs"
symbol = "std::env::var(\"PORT\")"
fingerprint = "{fingerprint}"
owner = "github:matsuokashuhei"
created_on = "2026-07-11"
expires_on = "2026-08-10"
removal_issue = "https://github.com/matsuokashuhei/walking-dog/issues/999"
adr = "docs/adr/9999-temporary.md"
justification = "Temporary containment while typed configuration is introduced."
"#
    );
    let set = ExceptionSet::parse(&source).expect("exception");
    assert!(
        unsuppressed_diagnostics(std::slice::from_ref(&diagnostic), &set)
            .expect("filter")
            .is_empty()
    );

    let drifted = architecture_validator::ast::Diagnostic {
        symbol: "std::env::var(\"OTHER\")".to_owned(),
        ..diagnostic
    };
    assert_eq!(
        unsuppressed_diagnostics(&[drifted], &set)
            .expect("filter")
            .len(),
        1
    );
}

#[test]
fn sarif_output_contains_rule_location_symbol_and_guidance() {
    let diagnostics = vec![architecture_validator::ast::Diagnostic {
        rule_id: "API-ARCH-001",
        path: "crates/domain/src/lib.rs".to_owned(),
        line: 3,
        symbol: "std::env::var".to_owned(),
        guidance: "inject typed configuration from api-bootstrap",
    }];

    let output = render_diagnostics(&diagnostics, OutputFormat::Sarif).expect("SARIF output");
    let value: serde_json::Value = serde_json::from_str(&output).expect("valid JSON");
    let result = &value["runs"][0]["results"][0];
    assert_eq!(result["ruleId"], "API-ARCH-001");
    assert_eq!(
        result["locations"][0]["physicalLocation"]["region"]["startLine"],
        3
    );
    assert!(
        result["message"]["text"]
            .as_str()
            .expect("message")
            .contains("std::env::var")
    );
    assert!(
        result["message"]["text"]
            .as_str()
            .expect("message")
            .contains("api-bootstrap")
    );
}

#[test]
fn sarif_cli_renders_real_violation_and_exits_nonzero() {
    let root = tempfile::tempdir().expect("temporary workspace");
    fs::create_dir_all(root.path().join("crates/domain/src")).expect("source directory");
    fs::write(
        root.path().join("crates/domain/src/lib.rs"),
        "pub fn port() { let _ = std::env::var(\"PORT\"); }\n",
    )
    .expect("violating source");
    let output = Command::new(env!("CARGO_BIN_EXE_architecture-validator"))
        .args([
            "--root",
            root.path().to_str().expect("UTF-8 path"),
            "--source-only",
            "--sarif",
        ])
        .output()
        .expect("run validator");
    assert!(!output.status.success());
    let value: serde_json::Value = serde_json::from_slice(&output.stdout).expect("SARIF stdout");
    assert_eq!(value["runs"][0]["results"][0]["ruleId"], "API-ARCH-001");
}
