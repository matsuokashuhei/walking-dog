use aws_sdk_sqs::operation::{
    delete_message::DeleteMessageError, receive_message::ReceiveMessageError,
    send_message::SendMessageError,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
        .map_err(|e| TrackPointQueueError::SendMessage(e.into_service_error()))?;

    Ok(())
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
    SendMessage(SendMessageError),
    #[error("SQS receive message error: {0}")]
    ReceiveMessage(ReceiveMessageError),
    #[error("SQS delete message error: {0}")]
    DeleteMessage(DeleteMessageError),
    #[error("SQS message has no body")]
    MissingBody,
    #[error("SQS message has no receipt handle")]
    MissingReceiptHandle,
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
