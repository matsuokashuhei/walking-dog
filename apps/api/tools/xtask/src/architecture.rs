use std::path::Path;

use architecture_validator::check::{OutputFormat, check_workspace, render_diagnostics};

pub fn check(root: &Path, sarif: bool) -> Result<(), String> {
    let outcome = check_workspace(root, true).map_err(|error| error.to_string())?;
    let output = render_diagnostics(
        &outcome.diagnostics,
        if sarif {
            OutputFormat::Sarif
        } else {
            OutputFormat::Human
        },
    )
    .map_err(|error| error.to_string())?;
    if !output.is_empty() {
        println!("{output}");
        return Err("architecture violations found".to_owned());
    }
    Ok(())
}
