use std::{env, sync::Arc};

use anyhow::Result;
use aws_sdk_sqs::types::Message;
use tokio::{sync::Semaphore, task::JoinSet, time::Duration};
use tracing::{error, info};
use walking_dog::queue::track_point::{TrackPointMessage, TrackPointQueueError};

const DEFAULT_WORKER_CONCURRENCY: usize = 10;
const RECEIVE_WAIT_SECONDS: i32 = 20;
const RECEIVE_MAX_MESSAGES: i32 = 10;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let sqs_client = build_sqs_client().await;
    let dynamodb_client = build_dynamodb_client().await;
    let worker_concurrency = env::var("TRACK_POINT_WORKER_CONCURRENCY")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_WORKER_CONCURRENCY);

    run_worker(sqs_client, dynamodb_client, worker_concurrency).await
}

async fn run_worker(
    sqs_client: aws_sdk_sqs::Client,
    dynamodb_client: aws_sdk_dynamodb::Client,
    worker_concurrency: usize,
) -> Result<()> {
    let semaphore = Arc::new(Semaphore::new(worker_concurrency));
    let mut tasks = JoinSet::new();

    info!(worker_concurrency, "track point worker started");

    loop {
        while let Some(result) = tasks.try_join_next() {
            if let Err(error) = result {
                error!(?error, "track point worker task panicked");
            }
        }

        let messages = match receive_messages(&sqs_client).await {
            Ok(messages) => messages,
            Err(error) => {
                error!(?error, "failed to receive track point messages");
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }
        };
        if messages.is_empty() {
            continue;
        }

        for message in messages {
            let permit = Arc::clone(&semaphore).acquire_owned().await?;
            let sqs_client = sqs_client.clone();
            let dynamodb_client = dynamodb_client.clone();

            tasks.spawn(async move {
                let _permit = permit;
                if let Err(error) = process_message(&sqs_client, &dynamodb_client, message).await {
                    error!(?error, "failed to process track point message");
                }
            });
        }
    }
}

async fn receive_messages(
    sqs_client: &aws_sdk_sqs::Client,
) -> Result<Vec<Message>, TrackPointQueueError> {
    let queue_url = std::env::var("AWS_SQS_QUEUE_URL_TRACK_POINT").unwrap();
    let output = sqs_client
        .receive_message()
        .queue_url(&queue_url)
        .max_number_of_messages(RECEIVE_MAX_MESSAGES)
        .wait_time_seconds(RECEIVE_WAIT_SECONDS)
        .send()
        .await
        .map_err(|error| TrackPointQueueError::ReceiveMessage(error.into_service_error()))?;

    Ok(output.messages().to_vec())
}

async fn process_message(
    sqs_client: &aws_sdk_sqs::Client,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    message: Message,
) -> Result<()> {
    let message_id = message.message_id().unwrap_or("unknown");
    let body = message.body().ok_or(TrackPointQueueError::MissingBody)?;
    let receipt_handle = message
        .receipt_handle()
        .ok_or(TrackPointQueueError::MissingReceiptHandle)?;
    let track_point_message = TrackPointMessage::from_json(body)?;
    let track_point = walking_dog::entity::track_point::Model::from(track_point_message.clone());

    let queue_url = std::env::var("AWS_SQS_QUEUE_URL_TRACK_POINT").unwrap();
    track_point.put(dynamodb_client).await?;
    sqs_client
        .delete_message()
        .queue_url(&queue_url)
        .receipt_handle(receipt_handle)
        .send()
        .await
        .map_err(|error| TrackPointQueueError::DeleteMessage(error.into_service_error()))?;

    info!(
        message_id,
        walk_id = %track_point_message.walk_id,
        tracked_at = %track_point_message.tracked_at,
        "processed track point message"
    );

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
