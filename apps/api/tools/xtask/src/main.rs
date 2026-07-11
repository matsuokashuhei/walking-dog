mod journey_generator;

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match args.as_slice() {
        [group, command, name, flag, spec] if group == "journey" && command == "new" && flag == "--spec" => {
            journey_generator::generate(std::path::Path::new("."), name, std::path::Path::new(spec))
        }
        [group, command] if group == "journey" && command == "verify-generated" => {
            journey_generator::verify(std::path::Path::new("."))
        }
        _ => Err("usage: cargo xtask journey new <use-case> --spec <toml> | cargo xtask journey verify-generated".into()),
    }
}
