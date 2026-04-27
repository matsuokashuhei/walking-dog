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
use aws_sdk_sqs::Client as SqsClient;
use axum::http::header::HeaderName;
use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::{DefaultOnFailure, DefaultOnRequest, DefaultOnResponse, TraceLayer};
use tower_http::LatencyUnit;
use tracing::Level;

pub struct AppState {
    pub db: DatabaseConnection,
    pub dynamo: DynamoClient,
    pub s3: S3Client,
    pub cognito: aws_sdk_cognitoidentityprovider::Client,
    pub sqs: SqsClient,
    pub config: Config,
    pub verifier: Arc<dyn JwtVerifier>,
}

#[derive(Clone)]
pub struct GraphqlState {
    pub schema: AppSchema,
    pub app_state: Arc<AppState>,
}

pub fn build_app(
    db: DatabaseConnection,
    dynamo: DynamoClient,
    s3: S3Client,
    cognito: aws_sdk_cognitoidentityprovider::Client,
    sqs: SqsClient,
    config: Config,
    verifier: Arc<dyn JwtVerifier>,
) -> Router {
    let state = Arc::new(AppState {
        db,
        dynamo,
        s3,
        cognito,
        sqs,
        config,
        verifier: verifier.clone(),
    });
    let schema = graphql::build_schema(state.clone());
    let graphql_state = GraphqlState {
        schema,
        app_state: state.clone(),
    };

    // Sentry middleware: NewSentryLayer creates a fresh Hub per request so user
    // context, breadcrumbs and transactions do not leak between concurrent requests.
    // SentryHttpLayer attaches HTTP request data (method, URL) to each event.
    // ServiceBuilder composes them into a single Layer that satisfies the
    // Send + Sync bounds required by Router::layer on axum 0.8.
    let sentry_layer = ServiceBuilder::new()
        .layer(sentry_tower::NewSentryLayer::new_from_top())
        .layer(sentry_tower::SentryHttpLayer::new().enable_transaction());

    let x_request_id = HeaderName::from_static("x-request-id");

    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(|request: &axum::http::Request<_>| {
            let request_id = request
                .headers()
                .get("x-request-id")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("-");
            tracing::info_span!(
                "http_request",
                method = %request.method(),
                path = %request.uri().path(),
                request_id = %request_id,
                status = tracing::field::Empty,
                latency_ms = tracing::field::Empty,
            )
        })
        .on_request(DefaultOnRequest::new().level(Level::INFO))
        .on_response(
            DefaultOnResponse::new()
                .level(Level::INFO)
                .latency_unit(LatencyUnit::Millis),
        )
        .on_failure(DefaultOnFailure::new().level(Level::ERROR));

    Router::new()
        .route("/graphql", post(graphql_handler))
        .layer(middleware::from_fn_with_state(
            verifier,
            auth::auth_middleware,
        ))
        .layer(sentry_layer)
        .layer(CorsLayer::permissive())
        .route("/health", get(|| async { "ok" }))
        // Layer order: the LAST `.layer()` is the outermost wrapper. So request
        // flow is SetRequestIdLayer → trace_layer → PropagateRequestIdLayer →
        // handler. SetRequestIdLayer must run first to populate x-request-id
        // before trace_layer reads it for the span.
        .layer(PropagateRequestIdLayer::new(x_request_id.clone()))
        .layer(trace_layer)
        .layer(SetRequestIdLayer::new(x_request_id, MakeRequestUuid))
        .with_state(graphql_state)
}

async fn graphql_handler(
    axum::extract::State(state): axum::extract::State<GraphqlState>,
    auth_user: Option<axum::Extension<auth::AuthUser>>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let cognito_sub: Option<String> = auth_user.map(|u| u.cognito_sub.clone());
    let request = req
        .into_inner()
        .data(cognito_sub)
        .data(graphql::loaders::build_user_loader(&state.app_state.db))
        .data(graphql::loaders::build_dog_loader(&state.app_state.db))
        .data(graphql::loaders::build_dog_members_loader(
            &state.app_state.db,
        ))
        .data(graphql::loaders::build_walk_dogs_loader(
            &state.app_state.db,
        ));
    state.schema.execute(request).await.into()
}
