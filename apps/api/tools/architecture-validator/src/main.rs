use std::path::Path;

use architecture_validator::check::{OutputFormat, check_workspace, render_diagnostics};

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let format = if args.iter().any(|argument| argument == "--sarif") {
        OutputFormat::Sarif
    } else {
        OutputFormat::Human
    };
    let validate_repository = !args.iter().any(|argument| argument == "--source-only");
    let root = args
        .windows(2)
        .find(|pair| pair[0] == "--root")
        .map_or(".", |pair| pair[1].as_str());
    let outcome = check_workspace(Path::new(root), validate_repository)?;
    let output = render_diagnostics(&outcome.diagnostics, format)?;
    if !output.is_empty() {
        println!("{output}");
        return Err("architecture violations found".into());
    }
    Ok(())
}
