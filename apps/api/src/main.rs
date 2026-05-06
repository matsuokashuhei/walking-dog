mod auth;
mod entity;
mod graphql;

use std::net::SocketAddr;

use crate::{
    entity::user,
    graphql::{mutation, query::Query},
};
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
use tracing::info;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_test_writer()
        .init();
    let schema = graphql::build_schema().await;
    let app = Router::new()
        .route("/", get(graphql_playground).post(graphql_handler))
        .route_layer(middleware::from_fn_with_state(
            schema.clone(),
            auth::autenticate_user,
        ))
        .route("/health", get(|| async { StatusCode::OK }))
        .with_state(schema);
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    axum::serve(TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}

async fn graphql_handler(
    State(schema): State<Schema<Query, mutation::Mutation, EmptySubscription>>,
    user: Option<axum::Extension<user::Model>>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    let mut request = request.into_inner();
    if let Some(axum::Extension(user)) = user {
        request = request.data(user);
    }
    schema.execute(request).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    Html(GraphiQLSource::build().finish())
}
