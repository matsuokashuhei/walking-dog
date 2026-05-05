use crate::auth::autenticate_token;
use async_graphql::http::GraphiQLSource;
use async_graphql_axum::GraphQL;
use axum::{Router, http::StatusCode, middleware, response::Html, routing::get};
use tokio::net::TcpListener;
mod auth;
mod entity;
mod graphql;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_test_writer()
        .init();
    let schema = graphql::build_schema().await;
    let app = Router::new()
        .route("/health", get(|| async { StatusCode::OK }))
        .route(
            "/",
            get(Html(GraphiQLSource::build().finish())).post_service(GraphQL::new(schema)),
        )
        .layer(middleware::from_fn(autenticate_token));
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 3000));
    axum::serve(TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}
