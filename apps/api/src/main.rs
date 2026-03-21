// apps/api/src/main.rs
mod auth;
mod aws;
mod config;
mod db;
mod entities;
mod error;
mod graphql;
mod services;

use axum::{Router, routing::get};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let config = config::Config::from_env();
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Listening on {}", addr);

    let app = Router::new()
        .route("/health", get(|| async { "ok" }));

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
