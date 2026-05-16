use std::{env, time::Duration};

use anyhow::Result;
use sqs_consumer::{Consumer, ConsumerOptions, TracingListener};
use tokio::task::JoinSet;
use walking_dog::queue::track_point::{
    DynamoDbTrackPointBatchWriter, TrackPointBatchHandler, TrackPointBatchWriter,
};

const DEFAULT_WORKER_CONCURRENCY: usize = 10;
const DEFAULT_BATCH_SIZE: i32 = 10;
const RECEIVE_WAIT_SECONDS: i32 = 20;
const DEFAULT_VISIBILITY_TIMEOUT_SECONDS: i32 = 60;
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS: u64 = 30;
const DEFAULT_HANDLER_TIMEOUT_SECONDS: u64 = 50;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let sqs_client = build_sqs_client().await;
    let dynamodb_client = build_dynamodb_client().await;
    let queue_url = env::var("AWS_SQS_QUEUE_URL_TRACK_POINT")?;
    let worker_concurrency =
        positive_usize_env("TRACK_POINT_WORKER_CONCURRENCY", DEFAULT_WORKER_CONCURRENCY);
    let batch_size = sqs_batch_size_env("TRACK_POINT_WORKER_BATCH_SIZE", DEFAULT_BATCH_SIZE);
    let handler_timeout_seconds = positive_u64_env(
        "TRACK_POINT_HANDLER_TIMEOUT_SECONDS",
        DEFAULT_HANDLER_TIMEOUT_SECONDS,
    );

    let options = ConsumerOptions::builder()
        .queue_url(queue_url)
        .sqs_client(sqs_client)
        .batch_size(batch_size)
        .wait_time_seconds(RECEIVE_WAIT_SECONDS)
        .visibility_timeout(DEFAULT_VISIBILITY_TIMEOUT_SECONDS)
        .handle_message_timeout(Duration::from_secs(handler_timeout_seconds))
        .heartbeat(sqs_consumer::HeartbeatConfig {
            interval: Duration::from_secs(DEFAULT_HEARTBEAT_INTERVAL_SECONDS),
            visibility_timeout: None,
        })
        .build()?;
    let handler = TrackPointBatchHandler::new(DynamoDbTrackPointBatchWriter::new(dynamodb_client));

    run_consumers(options, handler, worker_concurrency).await?;

    Ok(())
}

async fn run_consumers<W>(
    options: ConsumerOptions,
    handler: TrackPointBatchHandler<W>,
    worker_concurrency: usize,
) -> Result<()>
where
    W: TrackPointBatchWriter + Clone,
{
    let mut tasks = JoinSet::new();
    let mut shutdown_handles = Vec::with_capacity(worker_concurrency);

    for worker_index in 0..worker_concurrency {
        let consumer = Consumer::with_batch_handler(options.clone(), handler.clone())?
            .listener(TracingListener);
        shutdown_handles.push(consumer.shutdown_handle());
        tasks.spawn(async move {
            tracing::info!(worker_index, "track point consumer started");
            consumer.run().await
        });
    }

    loop {
        tokio::select! {
            signal = sqs_consumer::shutdown_signal() => {
                signal?;
                tracing::info!("graceful shutdown triggered");
                for shutdown in &shutdown_handles {
                    shutdown.graceful();
                }
                break;
            }
            result = tasks.join_next(), if !tasks.is_empty() => {
                match result {
                    Some(Ok(Ok(()))) => {
                        if tasks.is_empty() {
                            return Ok(());
                        }
                    }
                    Some(Ok(Err(error))) => {
                        for shutdown in &shutdown_handles {
                            shutdown.abort();
                        }
                        return Err(error.into());
                    }
                    Some(Err(error)) => {
                        for shutdown in &shutdown_handles {
                            shutdown.abort();
                        }
                        return Err(error.into());
                    }
                    None => return Ok(()),
                }
            }
        }
    }

    while let Some(result) = tasks.join_next().await {
        result??;
    }

    Ok(())
}

fn positive_usize_env(name: &str, default: usize) -> usize {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(default)
}

fn positive_u64_env(name: &str, default: u64) -> u64 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(default)
}

fn sqs_batch_size_env(name: &str, default: i32) -> i32 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<i32>().ok())
        .filter(|value| (1..=10).contains(value))
        .unwrap_or(default)
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
