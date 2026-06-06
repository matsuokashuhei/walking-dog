mod cursor;
mod error;
pub mod guard;
pub mod mutation;
pub mod object;
pub mod query;
pub(crate) mod upload;

use std::{env, sync::Arc};

use crate::graphql::query::Query;
use crate::queue::track_point::TrackPointEnqueuer;
use crate::service::storage::{S3StorageGateway, SharedStorageGateway};
use crate::service::track_point::{DynamoDbTrackPointRepository, SharedTrackPointRepository};
use anyhow::Result;
use async_graphql::{EmptySubscription, extensions::Tracing};
use tracing::info;

pub async fn build_schema()
-> anyhow::Result<async_graphql::Schema<Query, mutation::Mutation, EmptySubscription>> {
    info!("Building GraphQL schema");
    let database_connection = build_database_connection().await;
    info!("Database client ready");
    let cognito_client = build_cognitoidentityprovider_client().await;
    info!("Cognito client ready");
    let track_point_repository = build_track_point_repository().await?;
    info!("Track point repository ready");
    let track_point_enqueuer = build_track_point_enqueuer().await?;
    info!("Track point enqueuer ready");
    let storage_gateway = build_storage_gateway().await;
    info!("Storage gateway ready");

    Ok(async_graphql::Schema::build(
        Query::default(),
        mutation::Mutation::default(),
        EmptySubscription,
    )
    .data(database_connection)
    .data(cognito_client)
    .data(track_point_repository)
    .data(track_point_enqueuer)
    .data(storage_gateway)
    .extension(Tracing)
    .finish())
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

async fn build_track_point_repository() -> Result<SharedTrackPointRepository> {
    let dynamodb_client = build_dynamodb_client().await;
    Ok(Arc::new(DynamoDbTrackPointRepository::from_env(
        dynamodb_client,
    )?))
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

async fn build_storage_gateway() -> SharedStorageGateway {
    Arc::new(S3StorageGateway::from_env(build_s3_client().await))
}

async fn build_track_point_enqueuer() -> Result<Arc<TrackPointEnqueuer>> {
    let sqs_client = build_sqs_client().await;
    let track_point_queue_url = match env::var("AWS_SQS_QUEUE_URL_TRACK_POINT") {
        Ok(value) if !value.is_empty() => value,
        _ => anyhow::bail!("AWS_SQS_QUEUE_URL_TRACK_POINT is not set"),
    };
    Ok(Arc::new(TrackPointEnqueuer::new(
        sqs_client,
        track_point_queue_url,
    )?))
}
