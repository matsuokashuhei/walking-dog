use std::{future::Future, io};

use adapter_postgres::Database;
use axum::{Json, Router, extract::State, http::StatusCode, routing::get};
use thiserror::Error;
use tokio::net::TcpListener;

use crate::{config::Config, health::Health, shutdown::ShutdownSignal};

#[derive(Debug, Error)]
pub enum CompositionError {
    #[error("API listener failed: {0}")]
    Io(#[from] io::Error),
    #[error("required dependency initialization failed: {0}")]
    DependencyInitialization(String),
}

pub async fn health_status(health: &Health) -> StatusCode {
    if health.is_ready().await {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}

async fn health(State(health): State<Health>) -> (StatusCode, Json<serde_json::Value>) {
    let status = health_status(&health).await;
    (status, Json(health.snapshot().await))
}

pub fn api_router(health: Health) -> Router {
    Router::new()
        .route("/health", get(self::health))
        .with_state(health)
}

/// Binds the API and verifies Postgres before reporting readiness.
///
/// # Errors
///
/// Returns an error when binding, dependency initialization, or serving fails.
pub async fn serve_api(
    config: &Config,
    health: Health,
    shutdown: ShutdownSignal,
) -> Result<(), CompositionError> {
    let listener = TcpListener::bind(config.api_bind_addr).await?;
    let database_url = config.database_url.clone();
    serve_api_with_initializer(listener, health, shutdown, async move {
        Database::connect(&database_url).await.map(|_database| ())
    })
    .await
}

/// Serves health while a required dependency initializer runs.
///
/// # Errors
///
/// Returns an error if initialization or serving fails.
pub async fn serve_api_with_initializer<F, E>(
    listener: TcpListener,
    health: Health,
    shutdown: ShutdownSignal,
    initializer: F,
) -> Result<(), CompositionError>
where
    F: Future<Output = Result<(), E>> + Send,
    E: std::fmt::Display,
{
    let server = serve_listener(listener, api_router(health.clone()), shutdown);
    tokio::pin!(server);
    tokio::select! {
        initialization = initializer => {
            initialization.map_err(|error| CompositionError::DependencyInitialization(error.to_string()))?;
            health.mark_ready().await;
            server.await.map_err(CompositionError::Io)
        }
        result = &mut server => result.map_err(CompositionError::Io),
    }
}

/// Serves an Axum router until graceful shutdown completes.
///
/// # Errors
///
/// Returns an I/O error when Axum cannot serve the listener.
pub async fn serve_listener(
    listener: TcpListener,
    router: Router,
    shutdown: ShutdownSignal,
) -> io::Result<()> {
    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown.wait())
        .await
}

pub async fn run_worker_until_shutdown(shutdown: ShutdownSignal) {
    shutdown.wait().await;
}

#[must_use]
pub const fn schema_sdl() -> &'static str {
    "type Query {\n  schemaRevision: String!\n}\n"
}
