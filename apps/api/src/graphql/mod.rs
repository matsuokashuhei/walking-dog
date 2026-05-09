mod cursor;
mod error;
pub mod guard;
pub mod mutation;
pub mod object;
pub mod query;

use std::env;

use crate::graphql::query::Query;
use async_graphql::{EmptySubscription, extensions::Tracing};

pub async fn build_schema() -> async_graphql::Schema<Query, mutation::Mutation, EmptySubscription> {
    async_graphql::Schema::build(
        Query::default(),
        mutation::Mutation::default(),
        EmptySubscription,
    )
    .data(build_database_connection().await)
    .data(build_cognitoidentityprovider_client().await)
    .data(build_dynamodb_client().await)
    .data(build_sqs_client().await)
    .data(build_s3_client().await)
    .extension(Tracing)
    .finish()
}

async fn build_database_connection() -> sea_orm::DatabaseConnection {
    sea_orm::Database::connect(std::env::var("DATABASE_URL").unwrap())
        .await
        .unwrap()
}

async fn build_cognitoidentityprovider_client() -> aws_sdk_cognitoidentityprovider::Client {
    let config_loader = aws_config::from_env();
    let config = match env::var("AWS_COGNITO_ENDPOINT") {
        Ok(endpoint) => config_loader.endpoint_url(endpoint).load().await,
        Err(_) => config_loader.load().await,
    };
    aws_sdk_cognitoidentityprovider::Client::new(&config)
}

async fn build_dynamodb_client() -> aws_sdk_dynamodb::Client {
    let config_loader = aws_config::from_env();
    let config = match env::var("AWS_DYNAMODB_ENDPOINT") {
        Ok(endpoint) => config_loader.endpoint_url(endpoint).load().await,
        Err(_) => config_loader.load().await,
    };
    aws_sdk_dynamodb::Client::new(&config)
}

async fn build_sqs_client() -> aws_sdk_sqs::Client {
    let config_loader = aws_config::from_env();
    let config = match env::var("AWS_SQS_ENDPOINT") {
        Ok(endpoint) => config_loader.endpoint_url(endpoint).load().await,
        Err(_) => config_loader.load().await,
    };
    aws_sdk_sqs::Client::new(&config)
}

async fn build_s3_client() -> aws_sdk_s3::Client {
    let config = aws_config::from_env().load().await;
    if let Ok(endpoint) = env::var("AWS_S3_ENDPOINT") {
        let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
        s3_config = s3_config.endpoint_url(endpoint).force_path_style(true);
        aws_sdk_s3::Client::from_conf(s3_config.build())
    } else {
        aws_sdk_s3::Client::new(&config)
    }
}
