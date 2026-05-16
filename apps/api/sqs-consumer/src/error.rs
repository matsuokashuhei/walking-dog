use std::fmt::Debug;

#[derive(Debug, thiserror::Error)]
pub enum ConsumerError {
    #[error("invalid consumer options: {0}")]
    InvalidOptions(String),
    #[error("invalid consumer configuration: {0}")]
    InvalidConfig(String),
    #[error("SQS receive message error")]
    ReceiveMessage(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("SQS delete message batch error for messages {failed_message_ids:?}")]
    DeleteMessageBatch {
        failed_message_ids: Vec<String>,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("SQS change message visibility error")]
    ChangeMessageVisibility(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("handler processing error")]
    Processing(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("handler timed out")]
    Timeout,
    #[error("heartbeat failed for message {message_id}")]
    HeartbeatFailed {
        message_id: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("handler returned invalid acknowledgement: {0}")]
    InvalidAck(String),
    #[error("invalid visibility timeout for {field}: {value}")]
    InvalidVisibilityTimeout { field: &'static str, value: i32 },
    #[error("graceful shutdown timed out while waiting for in-flight processing: {message_ids:?}")]
    GracefulShutdownTimeout { message_ids: Vec<String> },
    #[error("in-flight processing aborted: {message_ids:?}")]
    Aborted { message_ids: Vec<String> },
    #[error("SQS message {message_id:?} has no receipt handle")]
    MissingReceiptHandle { message_id: Option<String> },
    #[error("shutdown signal error")]
    ShutdownSignal(#[source] std::io::Error),
    #[error("consumer task join error")]
    Join(#[source] tokio::task::JoinError),
}
