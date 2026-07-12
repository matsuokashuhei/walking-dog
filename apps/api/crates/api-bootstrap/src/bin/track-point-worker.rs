use api_bootstrap::{composition, config::Config, observability, shutdown::Shutdown};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    observability::initialize()?;
    let _config = Config::from_env()?;
    let shutdown = Shutdown::new();
    let shutdown_signal = shutdown.subscribe();
    let operation = async {
        composition::run_worker_until_shutdown(shutdown_signal).await;
        Ok::<(), std::convert::Infallible>(())
    };
    api_bootstrap::shutdown::coordinate_shutdown(
        shutdown,
        operation,
        api_bootstrap::shutdown::wait_for_termination(),
    )
    .await?;
    Ok(())
}
