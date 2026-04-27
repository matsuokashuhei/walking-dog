use crate::error::AppError;
use crate::services::walk_points_service::{self, WalkPointInput};
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_sqs::{types::DeleteMessageBatchRequestEntry, Client as SqsClient};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct WalkPointsQueueMessage {
    pub walk_id: Uuid,
    pub points: Vec<WalkPointInput>,
}

#[derive(Debug, Default, PartialEq, Eq)]
pub struct DrainWalkPointsQueueResult {
    pub received: usize,
    pub deleted: usize,
    pub failed: usize,
}

pub fn build_message_body(walk_id: Uuid, points: Vec<WalkPointInput>) -> Result<String, AppError> {
    let points = walk_points_service::sanitize_points(points)?;
    serde_json::to_string(&WalkPointsQueueMessage { walk_id, points }).map_err(|error| {
        AppError::Internal(format!("Serialize walk points queue message: {error}"))
    })
}

pub async fn enqueue_walk_points(
    client: &SqsClient,
    queue_url: &str,
    walk_id: Uuid,
    points: Vec<WalkPointInput>,
) -> Result<bool, AppError> {
    if queue_url.is_empty() {
        return Err(AppError::Internal(
            "SQS queue URL is not configured".to_string(),
        ));
    }

    let body = build_message_body(walk_id, points)?;

    client
        .send_message()
        .queue_url(queue_url)
        .message_body(body)
        .send()
        .await
        .map_err(|error| {
            tracing::error!(
                error = ?error,
                queue_url,
                walk_id = %walk_id,
                "SQS SendMessage failed"
            );
            AppError::Internal(format!(
                "SQS SendMessage: {}",
                crate::error::format_error_chain(&error)
            ))
        })?;

    Ok(true)
}

pub async fn drain_walk_points_queue_once(
    sqs: &SqsClient,
    queue_url: &str,
    dynamo: &DynamoClient,
    table_name: &str,
    wait_time_seconds: i32,
    max_messages: i32,
) -> Result<DrainWalkPointsQueueResult, AppError> {
    let output = sqs
        .receive_message()
        .queue_url(queue_url)
        .max_number_of_messages(max_messages)
        .wait_time_seconds(wait_time_seconds)
        .send()
        .await
        .map_err(|error| {
            tracing::error!(
                error = ?error,
                queue_url,
                wait_time_seconds,
                max_messages,
                "SQS ReceiveMessage failed"
            );
            AppError::Internal(format!(
                "SQS ReceiveMessage: {}",
                crate::error::format_error_chain(&error)
            ))
        })?;

    let messages = output.messages();
    if messages.is_empty() {
        return Ok(DrainWalkPointsQueueResult::default());
    }

    let mut delete_entries = Vec::new();
    let mut failed = 0usize;

    for (index, message) in messages.iter().enumerate() {
        let message_id = message
            .message_id()
            .map(str::to_string)
            .unwrap_or_else(|| format!("message-{index}"));

        match process_received_message(message.body(), dynamo, table_name).await {
            Ok(()) => {
                let Some(receipt_handle) = message.receipt_handle() else {
                    failed += 1;
                    tracing::error!(message_id, "SQS message missing receipt handle");
                    continue;
                };

                match DeleteMessageBatchRequestEntry::builder()
                    .id(message_id)
                    .receipt_handle(receipt_handle)
                    .build()
                {
                    Ok(entry) => delete_entries.push(entry),
                    Err(error) => {
                        failed += 1;
                        tracing::error!(error = ?error, "Failed to build SQS delete entry");
                    }
                }
            }
            Err(error) => {
                failed += 1;
                tracing::error!(
                    error = %error,
                    message_id,
                    "Failed to process walk points queue message"
                );
            }
        }
    }

    let deleted = delete_entries.len();
    if deleted > 0 {
        sqs.delete_message_batch()
            .queue_url(queue_url)
            .set_entries(Some(delete_entries))
            .send()
            .await
            .map_err(|error| {
                tracing::error!(
                    error = ?error,
                    queue_url,
                    deleted,
                    "SQS DeleteMessageBatch failed"
                );
                AppError::Internal(format!(
                    "SQS DeleteMessageBatch: {}",
                    crate::error::format_error_chain(&error)
                ))
            })?;
    }

    Ok(DrainWalkPointsQueueResult {
        received: messages.len(),
        deleted,
        failed,
    })
}

async fn process_received_message(
    body: Option<&str>,
    dynamo: &DynamoClient,
    table_name: &str,
) -> Result<(), AppError> {
    let body = body.ok_or_else(|| AppError::Internal("SQS message body is missing".to_string()))?;
    let message: WalkPointsQueueMessage = serde_json::from_str(body).map_err(|error| {
        AppError::Internal(format!("Deserialize walk points queue message: {error}"))
    })?;

    walk_points_service::add_walk_points(dynamo, table_name, message.walk_id, message.points)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_message_body_roundtrips_queue_message() {
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        let body = build_message_body(
            walk_id,
            vec![WalkPointInput {
                lat: 35.6812,
                lng: 139.7671,
                recorded_at: "2026-04-24T10:00:00Z".to_string(),
            }],
        )
        .unwrap();

        let message: WalkPointsQueueMessage = serde_json::from_str(&body).unwrap();
        assert_eq!(message.walk_id, walk_id);
        assert_eq!(message.points.len(), 1);
        assert_eq!(message.points[0].recorded_at, "2026-04-24T10:00:00Z");
    }

    #[test]
    fn build_message_body_uses_sanitized_points() {
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        let body = build_message_body(
            walk_id,
            vec![
                WalkPointInput {
                    lat: 35.0,
                    lng: 139.0,
                    recorded_at: "2026-04-24T10:00:00Z".to_string(),
                },
                WalkPointInput {
                    lat: 35.1,
                    lng: 139.1,
                    recorded_at: "2026-04-24T10:00:00Z".to_string(),
                },
            ],
        )
        .unwrap();

        let message: WalkPointsQueueMessage = serde_json::from_str(&body).unwrap();
        assert_eq!(message.points.len(), 1);
        assert!((message.points[0].lat - 35.1).abs() < 1e-9);
    }
}
