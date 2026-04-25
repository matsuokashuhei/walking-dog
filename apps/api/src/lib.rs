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
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;

#[derive(Debug, Clone, PartialEq, Eq)]
struct GraphqlOperationMetadata {
    operation_type: &'static str,
    operation_name: String,
}

fn strip_graphql_leading_comments(mut query: &str) -> &str {
    loop {
        let trimmed = query.trim_start();
        if let Some(rest) = trimmed.strip_prefix('#') {
            if let Some(newline) = rest.find('\n') {
                query = &rest[newline + 1..];
                continue;
            }
            return "";
        }
        return trimmed;
    }
}

fn extract_named_operation(query: &str, operation_type: &'static str) -> Option<String> {
    let rest = match operation_type {
        "mutation" => query.strip_prefix("mutation")?,
        "subscription" => query.strip_prefix("subscription")?,
        _ => query.strip_prefix("query")?,
    };
    let name: String = rest
        .trim_start()
        .chars()
        .take_while(|ch| ch.is_ascii_alphanumeric() || *ch == '_')
        .collect();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}

fn graphql_operation_metadata(request: &async_graphql::Request) -> GraphqlOperationMetadata {
    let trimmed = strip_graphql_leading_comments(&request.query);
    let operation_type = if trimmed.starts_with("mutation") {
        "mutation"
    } else if trimmed.starts_with("subscription") {
        "subscription"
    } else {
        "query"
    };

    let operation_name = request
        .operation_name
        .clone()
        .filter(|name| !name.is_empty())
        .or_else(|| extract_named_operation(trimmed, operation_type))
        .unwrap_or_else(|| "anonymous".to_string());

    GraphqlOperationMetadata {
        operation_type,
        operation_name,
    }
}

fn configure_graphql_sentry_scope(request: &async_graphql::Request) {
    let metadata = graphql_operation_metadata(request);
    sentry::configure_scope(|scope| {
        scope.set_tag("graphql.operation_type", metadata.operation_type);
        scope.set_tag("graphql.operation_name", metadata.operation_name.clone());
    });
}

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

    // Sentry middleware: NewSentryLayer creates a fresh Hub per request so user
    // context, breadcrumbs and transactions do not leak between concurrent requests.
    // SentryHttpLayer attaches HTTP request data (method, URL) to each event.
    // ServiceBuilder composes them into a single Layer that satisfies the
    // Send + Sync bounds required by Router::layer on axum 0.8.
    let sentry_layer = ServiceBuilder::new()
        .layer(sentry_tower::NewSentryLayer::new_from_top())
        .layer(sentry_tower::SentryHttpLayer::new().enable_transaction());

    Router::new()
        .route("/graphql", post(graphql_handler))
        .layer(middleware::from_fn_with_state(
            verifier,
            auth::auth_middleware,
        ))
        .layer(sentry_layer)
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
    let request = req.into_inner();
    configure_graphql_sentry_scope(&request);
    let request = request.data(cognito_sub);
    schema.execute(request).await.into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn graphql_operation_metadata_uses_explicit_operation_name() {
        let request = async_graphql::Request::new("query Walk { walk(id: \"1\") { id } }")
            .operation_name("WalkOverride");

        assert_eq!(
            graphql_operation_metadata(&request),
            GraphqlOperationMetadata {
                operation_type: "query",
                operation_name: "WalkOverride".to_string(),
            }
        );
    }

    #[test]
    fn graphql_operation_metadata_derives_named_mutation() {
        let request = async_graphql::Request::new(
            "mutation RecordWalkEvent($input: RecordWalkEventInput!) { recordWalkEvent(input: $input) { id } }",
        );

        assert_eq!(
            graphql_operation_metadata(&request),
            GraphqlOperationMetadata {
                operation_type: "mutation",
                operation_name: "RecordWalkEvent".to_string(),
            }
        );
    }

    #[test]
    fn graphql_operation_metadata_skips_leading_comments() {
        let request = async_graphql::Request::new(
            "# mobile walk detail\n query Walk { walk(id: \"1\") { id } }",
        );

        assert_eq!(
            graphql_operation_metadata(&request),
            GraphqlOperationMetadata {
                operation_type: "query",
                operation_name: "Walk".to_string(),
            }
        );
    }

    #[test]
    fn graphql_operation_metadata_marks_anonymous_query() {
        let request = async_graphql::Request::new("{ me { id } }");

        assert_eq!(
            graphql_operation_metadata(&request),
            GraphqlOperationMetadata {
                operation_type: "query",
                operation_name: "anonymous".to_string(),
            }
        );
    }
}
