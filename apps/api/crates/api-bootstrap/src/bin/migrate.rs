use adapter_postgres::migrations::{EmptyBaseline, MigrationContract};
use api_bootstrap::config::Config;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _config = Config::from_env()?;
    let mut database = MigrationContract::fresh();
    EmptyBaseline::apply(&mut database).map_err(|_| "empty baseline migration failed")?;
    Ok(())
}
