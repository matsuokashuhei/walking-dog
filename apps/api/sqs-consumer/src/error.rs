use std::fmt::Debug;

#[derive(Debug, thiserror::Error)]
pub enum ConsumerError {
    #[error("invalid consumer options: {0}")]
    InvalidOptions(String),
    #[error("SQS receive message error")]
    ReceiveMessage(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("SQS delete message batch error")]
    DeleteMessageBatch(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("SQS change message visibility error")]
    ChangeMessageVisibility(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("handler processing error")]
    Processing(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("handler timed out")]
    Timeout,
    #[error("SQS message {message_id:?} has no receipt handle")]
    MissingReceiptHandle { message_id: Option<String> },
    #[error("shutdown signal error")]
    ShutdownSignal(#[source] std::io::Error),
    #[error("consumer task join error")]
    Join(#[source] tokio::task::JoinError),
}
