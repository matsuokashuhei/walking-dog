use std::fs;

use architecture_validator::check::{OutputFormat, check_workspace, render_diagnostics};

#[test]
fn workspace_check_discovers_unreachable_rust_and_reports_complete_human_diagnostic() {
    let root = tempfile::tempdir().expect("temporary workspace");
    fs::create_dir_all(root.path().join("crates/domain/src")).expect("source directory");
    fs::write(
        root.path().join("crates/domain/src/unreachable.rs"),
        "pub fn secret() { tracing::info!(access_token = token); }\n",
    )
    .expect("unreachable source");

    let diagnostics = check_workspace(root.path(), false).expect("workspace source check");
    let output = render_diagnostics(&diagnostics, OutputFormat::Human).expect("human output");

    assert!(output.contains("API-ARCH-012"));
    assert!(output.contains("crates/domain/src/unreachable.rs:1"));
    assert!(output.contains("tracing::info!"));
    assert!(output.contains("permitted destination"));
    assert!(output.contains("guidance"));
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
