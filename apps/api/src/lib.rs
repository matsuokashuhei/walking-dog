pub mod auth;
pub mod aws;
pub mod config;
pub mod db;
pub mod entities;
pub mod error;
pub mod graphql;
pub mod services;

use crate::auth::jwt::JwtVerifier;
use crate::config::Config;
use crate::graphql::AppSchema;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_s3::Client as S3Client;
use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

pub struct AppState {
    pub db: DatabaseConnection,
    pub dynamo: DynamoClient,
    pub s3: S3Client,
    pub cognito: aws_sdk_cognitoidentityprovider::Client,
    pub config: Config,
    pub verifier: Arc<dyn JwtVerifier>,
}

pub fn build_app(
    db: DatabaseConnection,
    dynamo: DynamoClient,
    s3: S3Client,
    cognito: aws_sdk_cognitoidentityprovider::Client,
    config: Config,
    verifier: Arc<dyn JwtVerifier>,
) -> Router {
    let state = Arc::new(AppState {
        db,
        dynamo,
        s3,
        cognito,
        config,
        verifier: verifier.clone(),
    });
    let schema = graphql::build_schema(state);

    Router::new()
        .route("/graphql", post(graphql_handler))
        .layer(middleware::from_fn_with_state(
            verifier,
            auth::auth_middleware,
        ))
        .layer(CorsLayer::permissive())
        .route("/health", get(|| async { "ok" }))
        .with_state(schema)
}

async fn graphql_handler(
    axum::extract::State(schema): axum::extract::State<AppSchema>,
    auth_user: Option<axum::Extension<auth::AuthUser>>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let cognito_sub: Option<String> = auth_user.map(|u| u.cognito_sub.clone());
    let request = req.into_inner().data(cognito_sub);
    schema.execute(request).await.into()
}
