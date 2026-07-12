use api_bootstrap::{
    composition, config::Config, health::Health, observability, shutdown::Shutdown,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    observability::initialize()?;
    let config = Config::from_env()?;
    let shutdown = Shutdown::new();
    let operation = composition::serve_api(&config, Health::new(), shutdown.subscribe());
    api_bootstrap::shutdown::coordinate_shutdown(
        shutdown,
        operation,
        api_bootstrap::shutdown::wait_for_termination(),
    )
    .await?;
    Ok(())
}
