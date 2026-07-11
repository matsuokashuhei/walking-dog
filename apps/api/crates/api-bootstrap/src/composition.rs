use std::io;

use axum::{Json, Router, extract::State, http::StatusCode, routing::get};

use crate::{config::Config, health::Health, shutdown::ShutdownSignal};

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

/// Runs the empty API until graceful shutdown.
///
/// # Errors
///
/// Returns an I/O error if the listener cannot bind or serve.
pub async fn serve_api(
    config: &Config,
    health: Health,
    shutdown: ShutdownSignal,
) -> io::Result<()> {
    let listener = tokio::net::TcpListener::bind(config.api_bind_addr).await?;
    health.mark_ready().await;
    axum::serve(listener, api_router(health))
        .with_graceful_shutdown(shutdown.wait())
        .await
}

pub async fn serve_api_until_shutdown(health: Health, shutdown: ShutdownSignal) {
    health.mark_ready().await;
    shutdown.wait().await;
}

pub async fn run_worker_until_shutdown(shutdown: ShutdownSignal) {
    shutdown.wait().await;
}

#[must_use]
pub const fn schema_sdl() -> &'static str {
    "type Query {\n  schemaRevision: String!\n}\n"
}
