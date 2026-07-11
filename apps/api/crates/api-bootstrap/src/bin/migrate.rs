use adapter_postgres::{Database, migrations::Migrator};
use api_bootstrap::config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_env()?;
    let database = Database::connect(&config.database_url).await?;
    Migrator::up(&database).await?;
    Ok(())
}
