use std::{env, time::Duration};

use anyhow::Result;
use sqs_consumer::{Consumer, ConsumerOptions, TracingListener};
use walking_dog::queue::track_point::{DynamoDbTrackPointBatchWriter, TrackPointBatchHandler};

const DEFAULT_WORKER_CONCURRENCY: i32 = 10;
const RECEIVE_WAIT_SECONDS: i32 = 20;
const DEFAULT_VISIBILITY_TIMEOUT_SECONDS: i32 = 60;
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS: u64 = 30;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let sqs_client = build_sqs_client().await;
    let dynamodb_client = build_dynamodb_client().await;
    let queue_url = env::var("AWS_SQS_QUEUE_URL_TRACK_POINT")?;
    let batch_size = env::var("TRACK_POINT_WORKER_CONCURRENCY")
        .ok()
        .and_then(|value| value.parse::<i32>().ok())
        .filter(|value| (1..=10).contains(value))
        .unwrap_or(DEFAULT_WORKER_CONCURRENCY);

    let options = ConsumerOptions::builder()
        .queue_url(queue_url)
        .sqs_client(sqs_client)
        .batch_size(batch_size)
        .wait_time_seconds(RECEIVE_WAIT_SECONDS)
        .visibility_timeout(DEFAULT_VISIBILITY_TIMEOUT_SECONDS)
        .heartbeat(sqs_consumer::HeartbeatConfig {
            interval: Duration::from_secs(DEFAULT_HEARTBEAT_INTERVAL_SECONDS),
            visibility_timeout: None,
        })
        .build()?;
    let handler = TrackPointBatchHandler::new(DynamoDbTrackPointBatchWriter::new(dynamodb_client));

    Consumer::with_batch_handler(options, handler)?
        .listener(TracingListener)
        .run_until_ctrl_c()
        .await?;

    Ok(())
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
