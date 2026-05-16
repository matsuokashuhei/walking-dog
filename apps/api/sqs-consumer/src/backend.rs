use async_trait::async_trait;
use aws_sdk_sqs::{
    Client,
    operation::{
        change_message_visibility::ChangeMessageVisibilityError,
        delete_message_batch::DeleteMessageBatchError, receive_message::ReceiveMessageError,
    },
    types::{DeleteMessageBatchRequestEntry, Message, MessageSystemAttributeName},
};

#[derive(Debug, thiserror::Error)]
pub(crate) enum BackendError {
    #[error("receive message failed")]
    Receive(#[source] Box<ReceiveMessageError>),
    #[error("delete message batch failed")]
    DeleteBatch(#[source] Box<DeleteMessageBatchError>),
    #[error("delete message batch returned failed entry indexes: {0:?}")]
    DeleteBatchFailed(Vec<usize>),
    #[error("change message visibility failed")]
    ChangeVisibility(#[source] Box<ChangeMessageVisibilityError>),
    #[cfg(test)]
    #[error("test backend error: {0}")]
    Test(String),
}

#[async_trait]
pub(crate) trait SqsBackend: Send + Sync + 'static {
    async fn receive_messages(
        &self,
        queue_url: &str,
        max_number_of_messages: i32,
        wait_time_seconds: i32,
        visibility_timeout: Option<i32>,
        attribute_names: &[MessageSystemAttributeName],
        message_attribute_names: &[String],
    ) -> Result<Vec<Message>, BackendError>;

    async fn delete_message_batch(
        &self,
        queue_url: &str,
        entries: Vec<(String, String)>,
    ) -> Result<(), BackendError>;

    async fn change_message_visibility(
        &self,
        queue_url: &str,
        receipt_handle: &str,
        visibility_timeout: i32,
    ) -> Result<(), BackendError>;
}

pub(crate) struct AwsSqsBackend {
    client: Client,
}

impl AwsSqsBackend {
    pub(crate) fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl SqsBackend for AwsSqsBackend {
    async fn receive_messages(
        &self,
        queue_url: &str,
        max_number_of_messages: i32,
        wait_time_seconds: i32,
        visibility_timeout: Option<i32>,
        attribute_names: &[MessageSystemAttributeName],
        message_attribute_names: &[String],
    ) -> Result<Vec<Message>, BackendError> {
        let mut request = self
            .client
            .receive_message()
            .queue_url(queue_url)
            .max_number_of_messages(max_number_of_messages)
            .wait_time_seconds(wait_time_seconds);
        if let Some(visibility_timeout) = visibility_timeout {
            request = request.visibility_timeout(visibility_timeout);
        }
        if !attribute_names.is_empty() {
            request = request.set_message_system_attribute_names(Some(attribute_names.to_vec()));
        }
        if !message_attribute_names.is_empty() {
            request = request.set_message_attribute_names(Some(message_attribute_names.to_vec()));
        }
        let output = request
            .send()
            .await
            .map_err(|error| BackendError::Receive(Box::new(error.into_service_error())))?;
        Ok(output.messages().to_vec())
    }

    async fn delete_message_batch(
        &self,
        queue_url: &str,
        entries: Vec<(String, String)>,
    ) -> Result<(), BackendError> {
        if entries.is_empty() {
            return Ok(());
        }
        let entries = entries
            .into_iter()
            .map(|(id, receipt_handle)| {
                DeleteMessageBatchRequestEntry::builder()
                    .id(id)
                    .receipt_handle(receipt_handle)
                    .build()
                    .expect("DeleteMessageBatchRequestEntry build should not fail")
            })
            .collect::<Vec<_>>();
        let output = self
            .client
            .delete_message_batch()
            .queue_url(queue_url)
            .set_entries(Some(entries))
            .send()
            .await
            .map_err(|error| BackendError::DeleteBatch(Box::new(error.into_service_error())))?;

        let failed = output
            .failed()
            .iter()
            .filter_map(|entry| entry.id().parse::<usize>().ok())
            .collect::<Vec<_>>();
        if failed.is_empty() {
            Ok(())
        } else {
            Err(BackendError::DeleteBatchFailed(failed))
        }
    }

    async fn change_message_visibility(
        &self,
        queue_url: &str,
        receipt_handle: &str,
        visibility_timeout: i32,
    ) -> Result<(), BackendError> {
        self.client
            .change_message_visibility()
            .queue_url(queue_url)
            .receipt_handle(receipt_handle)
            .visibility_timeout(visibility_timeout)
            .send()
            .await
            .map_err(|error| {
                BackendError::ChangeVisibility(Box::new(error.into_service_error()))
            })?;
        Ok(())
    }
}
