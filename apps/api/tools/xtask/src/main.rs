mod architecture;
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
        [group, command] if group == "architecture" && command == "check" => {
            architecture::check(std::path::Path::new("."), false, None, "HEAD")
        }
        [group, command, flag]
            if group == "architecture" && command == "check" && flag == "--sarif" =>
        {
            architecture::check(std::path::Path::new("."), true, None, "HEAD")
        }
        [group, command, flag, base]
            if group == "architecture" && command == "check" && flag == "--base" =>
        {
            architecture::check(std::path::Path::new("."), false, Some(base), "HEAD")
        }
        [group, command, base_flag, base, head_flag, head]
            if group == "architecture" && command == "check" && base_flag == "--base" && head_flag == "--head" =>
        {
            architecture::check(std::path::Path::new("."), false, Some(base), head)
        }
        [group, command, name, flag, spec] if group == "journey" && command == "new" && flag == "--spec" => {
            journey_generator::generate(std::path::Path::new("."), name, std::path::Path::new(spec))
        }
        [group, command] if group == "journey" && command == "verify-generated" => {
            journey_generator::verify(std::path::Path::new("."))
        }
        _ => Err("usage: cargo xtask architecture check [--sarif] | cargo xtask journey new <use-case> --spec <toml> | cargo xtask journey verify-generated".into()),
    }
}
