use api_bootstrap::{
    composition, config::Config, health::Health, observability, shutdown::Shutdown,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    observability::initialize()?;
    let config = Config::from_env()?;
    let shutdown = Shutdown::new();
    let trigger = shutdown.clone();
    tokio::spawn(async move {
        if api_bootstrap::shutdown::wait_for_termination()
            .await
            .is_ok()
        {
            trigger.trigger();
        }
    });
    composition::serve_api(&config, Health::new(), shutdown.subscribe()).await?;
    Ok(())
}
