use async_trait::async_trait;
use aws_sdk_sqs::types::Message;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum HandleOutcome {
    Ack,
    Nack,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BatchOutcome {
    AckAll,
    NackAll,
    Partial { ack_message_ids: Vec<String> },
}

#[async_trait]
pub trait MessageHandler: Send + Sync + 'static {
    type Error: std::error::Error + Send + Sync + 'static;

    async fn handle_message(&self, message: Message) -> Result<HandleOutcome, Self::Error>;
}

#[async_trait]
pub trait BatchMessageHandler: Send + Sync + 'static {
    type Error: std::error::Error + Send + Sync + 'static;

    async fn ack_before_batch(&self, _messages: &[Message]) -> Result<Vec<String>, Self::Error> {
        Ok(Vec::new())
    }

    async fn handle_batch(&self, messages: Vec<Message>) -> Result<BatchOutcome, Self::Error>;
}
