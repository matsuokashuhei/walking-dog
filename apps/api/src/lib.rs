pub mod auth;
pub mod aws;
pub mod config;
pub mod db;
pub mod entities;
pub mod error;
pub mod graphql;
pub mod services;

use std::sync::Arc;
use axum::{Router, middleware, routing::{get, post}};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use sea_orm::DatabaseConnection;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_s3::Client as S3Client;
use crate::config::Config;
use crate::graphql::AppSchema;

pub struct AppState {
    pub db: DatabaseConnection,
    pub dynamo: DynamoClient,
    pub s3: S3Client,
    pub config: Config,
}

pub fn build_app(
    db: DatabaseConnection,
    dynamo: DynamoClient,
    s3: S3Client,
    config: Config,
) -> Router {
    let state = Arc::new(AppState { db, dynamo, s3, config });

    let schema = async_graphql::Schema::build(
        graphql::QueryRoot::default(),
        graphql::MutationRoot::default(),
        async_graphql::EmptySubscription,
    )
    .data(state.clone())
    .finish();

    Router::new()
        .route("/graphql", post(graphql_handler))
        .layer(middleware::from_fn(auth::auth_middleware))
        .route("/health", get(|| async { "ok" }))
        .with_state(schema)
}

async fn graphql_handler(
    axum::extract::State(schema): axum::extract::State<AppSchema>,
    axum::Extension(auth_user): axum::Extension<auth::AuthUser>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let request = req.into_inner().data(auth_user.cognito_sub);
    schema.execute(request).await.into()
}
