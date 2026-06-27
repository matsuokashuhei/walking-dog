use std::{env, process::ExitCode, time::Duration};

use anyhow::Result;
use sqs_consumer::{Consumer, ConsumerOptions, TracingListener};
use tokio::task::JoinSet;
use walking_dog::{
    observability,
    queue::track_point::{TrackPointBatchHandler, TrackPointBatchWriter},
    service::track_point::DynamoDbTrackPointRepository,
};

const DEFAULT_WORKER_CONCURRENCY: usize = 1;
const DEFAULT_BATCH_SIZE: i32 = 10;
const DEFAULT_VISIBILITY_TIMEOUT_SECONDS: i32 = 60;
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS: u64 = 30;
const DEFAULT_HANDLER_TIMEOUT_SECONDS: u64 = 50;
const DEFAULT_POLLING_WAIT_SECONDS: u64 = 60;

#[tokio::main]
async fn main() -> ExitCode {
    let _sentry = observability::init();

    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            let error_ref: &(dyn std::error::Error + 'static) = error.as_ref();
            tracing::error!(error = error_ref, "track point worker exited with error");
            ExitCode::FAILURE
        }
    }
}

async fn run() -> Result<()> {
    let sqs_client = build_sqs_client().await;
    let dynamodb_client = build_dynamodb_client().await;
    let queue_url = env::var("AWS_SQS_QUEUE_URL_TRACK_POINT")?;
    let worker_concurrency = env::var("TRACK_POINT_WORKER_CONCURRENCY")
        .map(|value| {
            value
                .parse::<usize>()
                .expect("TRACK_POINT_WORKER_CONCURRENCY must be a usize")
        })
        .unwrap_or(DEFAULT_WORKER_CONCURRENCY);

    let options = ConsumerOptions::builder()
        .queue_url(queue_url)
        .sqs_client(sqs_client)
        .batch_size(
            env::var("TRACK_POINT_WORKER_BATCH_SIZE")
                .map(|value| {
                    value
                        .parse::<i32>()
                        .expect("TRACK_POINT_WORKER_BATCH_SIZE must be an i32")
                })
                .unwrap_or(DEFAULT_BATCH_SIZE),
        )
        .wait_time_seconds(20)
        .polling_wait_time(Duration::from_secs(
            env::var("TRACK_POINT_WORKER_POLLING_WAIT_SECONDS")
                .map(|value| {
                    value
                        .parse::<u64>()
                        .expect("TRACK_POINT_WORKER_POLLING_WAIT_SECONDS must be a u64")
                })
                .unwrap_or(DEFAULT_POLLING_WAIT_SECONDS),
        ))
        .visibility_timeout(DEFAULT_VISIBILITY_TIMEOUT_SECONDS)
        .handle_message_timeout(Duration::from_secs(
            env::var("TRACK_POINT_HANDLER_TIMEOUT_SECONDS")
                .map(|value| {
                    value
                        .parse::<u64>()
                        .expect("TRACK_POINT_HANDLER_TIMEOUT_SECONDS must be a u64")
                })
                .unwrap_or(DEFAULT_HANDLER_TIMEOUT_SECONDS),
        ))
        .heartbeat(sqs_consumer::HeartbeatConfig::new(Duration::from_secs(
            DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
        )))
        .build()?;
    let handler =
        TrackPointBatchHandler::new(DynamoDbTrackPointRepository::from_env(dynamodb_client)?);

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
