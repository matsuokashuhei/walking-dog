use api_bootstrap::{composition, config::Config, observability, shutdown::Shutdown};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    observability::initialize()?;
    let _config = Config::from_env()?;
    let shutdown = Shutdown::new();
    let trigger = shutdown.clone();
    tokio::spawn(async move {
        if tokio::signal::ctrl_c().await.is_ok() {
            trigger.trigger();
        }
    });
    composition::run_worker_until_shutdown(shutdown.subscribe()).await;
    Ok(())
}
