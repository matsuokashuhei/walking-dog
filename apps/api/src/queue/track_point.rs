use async_trait::async_trait;
use aws_sdk_sqs::operation::{
    delete_message::DeleteMessageError, delete_message_batch::DeleteMessageBatchError,
    receive_message::ReceiveMessageError, send_message::SendMessageError,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqs_consumer::{BatchMessageHandler, BatchOutcome, HandleOutcome, MessageHandler};
use uuid::Uuid;

use crate::entity::track_point;

const TRACK_POINT_MESSAGE_VERSION: u16 = 1;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct TrackPointMessage {
    pub version: u16,
    pub walk_id: Uuid,
    pub tracked_at: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
    pub enqueued_at: DateTime<Utc>,
}

impl TrackPointMessage {
    pub fn new(
        walk_id: Uuid,
        tracked_at: DateTime<Utc>,
        latitude: f64,
        longitude: f64,
        enqueued_at: DateTime<Utc>,
    ) -> Self {
        Self {
            version: TRACK_POINT_MESSAGE_VERSION,
            walk_id,
            tracked_at,
            latitude,
            longitude,
            enqueued_at,
        }
    }

    pub fn to_json(&self) -> Result<String, TrackPointQueueError> {
        serde_json::to_string(self).map_err(TrackPointQueueError::Serialize)
    }

    pub fn from_json(body: &str) -> Result<Self, TrackPointQueueError> {
        let message: Self =
            serde_json::from_str(body).map_err(TrackPointQueueError::Deserialize)?;
        if message.version != TRACK_POINT_MESSAGE_VERSION {
            return Err(TrackPointQueueError::UnsupportedVersion(message.version));
        }
        Ok(message)
    }
}

impl From<TrackPointMessage> for track_point::Model {
    fn from(message: TrackPointMessage) -> Self {
        track_point::Model::new(
            message.walk_id,
            message.tracked_at,
            message.latitude,
            message.longitude,
        )
    }
}

pub async fn enqueue_track_point(
    client: &aws_sdk_sqs::Client,
    message: &TrackPointMessage,
) -> Result<(), TrackPointQueueError> {
    let queue_url = std::env::var("AWS_SQS_QUEUE_URL_TRACK_POINT").unwrap();
    client
        .send_message()
        .queue_url(&queue_url)
        .message_body(message.to_json()?)
        .send()
        .await
        .map_err(|e| TrackPointQueueError::SendMessage(Box::new(e.into_service_error())))?;

    Ok(())
}

#[async_trait]
pub trait TrackPointBatchWriter: Send + Sync + 'static {
    async fn batch_put_write(
        &self,
        models: &[track_point::Model],
    ) -> Result<(), TrackPointBatchHandlerError>;
}

#[derive(Clone)]
pub struct DynamoDbTrackPointBatchWriter {
    client: aws_sdk_dynamodb::Client,
}

impl DynamoDbTrackPointBatchWriter {
    pub fn new(client: aws_sdk_dynamodb::Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl TrackPointBatchWriter for DynamoDbTrackPointBatchWriter {
    async fn batch_put_write(
        &self,
        models: &[track_point::Model],
    ) -> Result<(), TrackPointBatchHandlerError> {
        track_point::Model::batch_put_write(&self.client, models)
            .await
            .map_err(TrackPointBatchHandlerError::BatchWrite)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TrackPointBatchHandlerError {
    #[error("DynamoDB batch write failed")]
    BatchWrite(#[source] anyhow::Error),
}

pub struct TrackPointBatchHandler<W> {
    writer: W,
}

impl<W> TrackPointBatchHandler<W>
where
    W: TrackPointBatchWriter,
{
    pub fn new(writer: W) -> Self {
        Self { writer }
    }
}

#[async_trait]
impl<W> BatchMessageHandler for TrackPointBatchHandler<W>
where
    W: TrackPointBatchWriter,
{
    type Error = TrackPointBatchHandlerError;

    async fn handle_batch(
        &self,
        messages: Vec<aws_sdk_sqs::types::Message>,
    ) -> Result<BatchOutcome, Self::Error> {
        let mut models = Vec::with_capacity(messages.len());
        let mut invalid_message_ids = Vec::new();

        for message in &messages {
            let Some(body) = message.body() else {
                if let Some(message_id) = message.message_id() {
                    invalid_message_ids.push(message_id.to_owned());
                }
                tracing::warn!(
                    message_id = message.message_id(),
                    "message has no body, acking"
                );
                continue;
            };

            match TrackPointMessage::from_json(body) {
                Ok(track_point_message) => {
                    models.push(track_point::Model::from(track_point_message));
                }
                Err(error) => {
                    if let Some(message_id) = message.message_id() {
                        invalid_message_ids.push(message_id.to_owned());
                    }
                    tracing::warn!(
                        message_id = message.message_id(),
                        ?error,
                        "failed to deserialize message, acking"
                    );
                }
            }
        }

        if models.is_empty() {
            return Ok(BatchOutcome::AckAll);
        }

        match self.writer.batch_put_write(&models).await {
            Ok(()) => Ok(BatchOutcome::AckAll),
            Err(error) if invalid_message_ids.is_empty() => Err(error),
            Err(_) => Ok(BatchOutcome::Partial {
                ack_message_ids: invalid_message_ids,
            }),
        }
    }
}

#[async_trait]
impl<W> MessageHandler for TrackPointBatchHandler<W>
where
    W: TrackPointBatchWriter,
{
    type Error = TrackPointBatchHandlerError;

    async fn handle_message(
        &self,
        message: aws_sdk_sqs::types::Message,
    ) -> Result<HandleOutcome, Self::Error> {
        let message_id = message.message_id().map(ToOwned::to_owned);
        match self.handle_batch(vec![message]).await? {
            BatchOutcome::AckAll => Ok(HandleOutcome::Ack),
            BatchOutcome::NackAll => Ok(HandleOutcome::Nack),
            BatchOutcome::Partial { ack_message_ids } => {
                if message_id.is_some_and(|id| ack_message_ids.contains(&id)) {
                    Ok(HandleOutcome::Ack)
                } else {
                    Ok(HandleOutcome::Nack)
                }
            }
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TrackPointQueueError {
    #[error("Failed to serialize track point message: {0}")]
    Serialize(serde_json::Error),
    #[error("Failed to deserialize track point message: {0}")]
    Deserialize(serde_json::Error),
    #[error("Unsupported track point message version: {0}")]
    UnsupportedVersion(u16),
    #[error("SQS send message error: {0}")]
    SendMessage(Box<SendMessageError>),
    #[error("SQS receive message error: {0}")]
    ReceiveMessage(Box<ReceiveMessageError>),
    #[error("SQS delete message error: {0}")]
    DeleteMessage(Box<DeleteMessageError>),
    #[error("SQS delete message batch error: {0}")]
    DeleteMessageBatch(Box<DeleteMessageBatchError>),
    #[error("SQS message has no body")]
    MissingBody,
    #[error("SQS message has no receipt handle")]
    MissingReceiptHandle,
}

#[cfg(test)]
mod tests {
    use super::*;
    use aws_sdk_sqs::types::Message;
    use std::sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    };

    #[test]
    fn serializes_and_deserializes_track_point_message() {
        let message = TrackPointMessage::new(
            Uuid::parse_str("018f6a72-3f7a-7a8b-9c0d-111111111111").unwrap(),
            DateTime::parse_from_rfc3339("2026-05-09T10:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            35.6812,
            139.7671,
            DateTime::parse_from_rfc3339("2026-05-09T10:00:01Z")
                .unwrap()
                .with_timezone(&Utc),
        );

        let body = message.to_json().unwrap();
        assert_eq!(TrackPointMessage::from_json(&body).unwrap(), message);
    }

    #[test]
    fn rejects_unsupported_message_version() {
        let body = r#"{
            "version": 2,
            "walk_id": "018f6a72-3f7a-7a8b-9c0d-111111111111",
            "tracked_at": "2026-05-09T10:00:00Z",
            "latitude": 35.6812,
            "longitude": 139.7671,
            "enqueued_at": "2026-05-09T10:00:01Z"
        }"#;

        let error = TrackPointMessage::from_json(body).unwrap_err();
        assert!(matches!(error, TrackPointQueueError::UnsupportedVersion(2)));
    }

    #[derive(Clone, Default)]
    struct FakeWriter {
        fail: Arc<AtomicBool>,
        written_count: Arc<std::sync::Mutex<usize>>,
    }

    #[async_trait]
    impl TrackPointBatchWriter for FakeWriter {
        async fn batch_put_write(
            &self,
            models: &[track_point::Model],
        ) -> Result<(), TrackPointBatchHandlerError> {
            *self.written_count.lock().unwrap() += models.len();
            if self.fail.load(Ordering::SeqCst) {
                return Err(TrackPointBatchHandlerError::BatchWrite(anyhow::anyhow!(
                    "dynamodb batch write failed"
                )));
            }
            Ok(())
        }
    }

    fn sqs_message(id: &str, body: Option<String>) -> Message {
        let mut builder = Message::builder()
            .message_id(id)
            .receipt_handle(format!("receipt-{id}"));
        if let Some(body) = body {
            builder = builder.body(body);
        }
        builder.build()
    }

    fn valid_body() -> String {
        TrackPointMessage::new(
            Uuid::parse_str("018f6a72-3f7a-7a8b-9c0d-111111111111").unwrap(),
            DateTime::parse_from_rfc3339("2026-05-09T10:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            35.6812,
            139.7671,
            DateTime::parse_from_rfc3339("2026-05-09T10:00:01Z")
                .unwrap()
                .with_timezone(&Utc),
        )
        .to_json()
        .unwrap()
    }

    #[tokio::test]
    async fn track_point_batch_handler_acks_all_after_successful_write() {
        let writer = FakeWriter::default();
        let written_count = writer.written_count.clone();
        let handler = TrackPointBatchHandler::new(writer);

        let outcome = handler
            .handle_batch(vec![sqs_message("valid", Some(valid_body()))])
            .await
            .unwrap();

        assert_eq!(outcome, BatchOutcome::AckAll);
        assert_eq!(*written_count.lock().unwrap(), 1);
    }

    #[tokio::test]
    async fn track_point_batch_handler_acks_malformed_and_missing_body_messages() {
        let handler = TrackPointBatchHandler::new(FakeWriter::default());

        let outcome = handler
            .handle_batch(vec![
                sqs_message("malformed", Some("{".into())),
                sqs_message("missing", None),
            ])
            .await
            .unwrap();

        assert_eq!(outcome, BatchOutcome::AckAll);
    }

    #[tokio::test]
    async fn track_point_batch_handler_keeps_valid_messages_unacked_when_write_fails() {
        let writer = FakeWriter::default();
        writer.fail.store(true, Ordering::SeqCst);
        let handler = TrackPointBatchHandler::new(writer);

        let error = handler
            .handle_batch(vec![sqs_message("valid", Some(valid_body()))])
            .await
            .unwrap_err();

        assert!(error.to_string().contains("DynamoDB batch write failed"));
    }

    #[tokio::test]
    async fn track_point_batch_handler_acks_only_invalid_messages_when_write_fails() {
        let writer = FakeWriter::default();
        writer.fail.store(true, Ordering::SeqCst);
        let handler = TrackPointBatchHandler::new(writer);

        let outcome = handler
            .handle_batch(vec![
                sqs_message("invalid", Some("{".into())),
                sqs_message("valid", Some(valid_body())),
            ])
            .await
            .unwrap();

        assert_eq!(
            outcome,
            BatchOutcome::Partial {
                ack_message_ids: vec!["invalid".into()]
            }
        );
    }
}
