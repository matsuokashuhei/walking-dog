use std::path::Path;

use architecture_validator::check::{OutputFormat, check_workspace, render_diagnostics};

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let format = if std::env::args()
        .skip(1)
        .any(|argument| argument == "--sarif")
    {
        OutputFormat::Sarif
    } else {
        OutputFormat::Human
    };
    let diagnostics = check_workspace(Path::new("."), true)?;
    let output = render_diagnostics(&diagnostics, format)?;
    if !output.is_empty() {
        println!("{output}");
    }
    Ok(())
}
