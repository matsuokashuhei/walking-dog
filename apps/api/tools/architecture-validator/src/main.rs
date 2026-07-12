use std::path::Path;

use architecture_validator::check::{OutputFormat, check_workspace_against, render_diagnostics};

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
    let base = args
        .windows(2)
        .find(|pair| pair[0] == "--base")
        .map(|pair| pair[1].as_str());
    let head = args
        .windows(2)
        .find(|pair| pair[0] == "--head")
        .map_or("HEAD", |pair| pair[1].as_str());
    let outcome = check_workspace_against(
        Path::new(root),
        validate_repository,
        base.map(|value| (value, head)),
    )?;
    let output = render_diagnostics(&outcome.diagnostics, format)?;
    if !output.is_empty() {
        println!("{output}");
        return Err("architecture violations found".into());
    }
    Ok(())
}
