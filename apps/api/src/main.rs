use std::net::SocketAddr;

use crate::graphql::{mutation, query::Query};
use async_graphql::{EmptySubscription, Schema, http::GraphiQLSource};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    Router,
    extract::State,
    http::StatusCode,
    middleware,
    response::{Html, IntoResponse},
    routing::get,
};
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
        .route("/", get(graphql_playground).post(graphql_handler))
        .route_layer(middleware::from_fn(auth::autenticate_token))
        .route("/health", get(|| async { StatusCode::OK }))
        .with_state(schema);
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    axum::serve(TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}

async fn graphql_handler(
    State(schema): State<Schema<Query, mutation::Mutation, EmptySubscription>>,
    claims: Option<axum::Extension<auth::Claims>>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    let mut request = request.into_inner();
    if let Some(claims) = claims {
        request = request.data(claims);
    }
    schema.execute(request).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    Html(GraphiQLSource::build().finish())
}
