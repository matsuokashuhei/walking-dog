use aws_sdk_sqs::types::Message;
use tracing::{debug, error, info, warn};

pub trait ConsumerListener: Send + Sync + 'static {
    fn on_started(&self) {}
    fn on_stopped(&self) {}
    fn on_aborted(&self, _aborted_message_ids: &[String]) {}
    fn on_polling_started(&self) {}
    fn on_polling_completed(&self) {}
    fn on_empty(&self) {}
    fn on_message_received(&self, _message: &Message) {}
    fn on_message_processed(&self, _message: &Message) {}
    fn on_response_processed(&self, _count: usize) {}
    fn on_waiting_for_polling(&self) {}
    fn on_polling_wait_exceeded(&self) {}
    fn on_error(&self, _error: &(dyn std::error::Error + 'static), _messages: Option<&[Message]>) {}
    fn on_processing_error(&self, _message: &Message, _error: &(dyn std::error::Error + 'static)) {}
    fn on_timeout_error(&self, _message: &Message) {}
    fn on_visibility_error(&self, _message: &Message, _error: &(dyn std::error::Error + 'static)) {}
}

#[derive(Default)]
pub struct NoopListener;

impl ConsumerListener for NoopListener {}

#[derive(Default)]
pub struct TracingListener;

impl ConsumerListener for TracingListener {
    fn on_started(&self) {
        info!("sqs consumer started");
    }

    fn on_stopped(&self) {
        info!("sqs consumer stopped");
    }

    fn on_aborted(&self, aborted_message_ids: &[String]) {
        warn!(?aborted_message_ids, "sqs consumer aborted");
    }

    fn on_polling_started(&self) {
        debug!("sqs consumer polling started");
    }

    fn on_polling_completed(&self) {
        debug!("sqs consumer polling completed");
    }

    fn on_empty(&self) {
        debug!("sqs consumer received empty response");
    }

    fn on_message_received(&self, message: &Message) {
        debug!(message_id = message.message_id(), "sqs message received");
    }

    fn on_message_processed(&self, message: &Message) {
        debug!(message_id = message.message_id(), "sqs message processed");
    }

    fn on_response_processed(&self, count: usize) {
        debug!(message_count = count, "sqs response processed");
    }

    fn on_waiting_for_polling(&self) {
        debug!("sqs consumer waiting before next poll");
    }

    fn on_polling_wait_exceeded(&self) {
        debug!("sqs consumer polling wait elapsed");
    }

    fn on_error(&self, error: &(dyn std::error::Error + 'static), messages: Option<&[Message]>) {
        error!(
            ?error,
            message_count = messages.map(|messages| messages.len()),
            "sqs consumer error"
        );
    }

    fn on_processing_error(&self, message: &Message, error: &(dyn std::error::Error + 'static)) {
        error!(
            message_id = message.message_id(),
            ?error,
            "sqs message processing error"
        );
    }

    fn on_timeout_error(&self, message: &Message) {
        error!(
            message_id = message.message_id(),
            "sqs message processing timed out"
        );
    }

    fn on_visibility_error(&self, message: &Message, error: &(dyn std::error::Error + 'static)) {
        error!(
            message_id = message.message_id(),
            ?error,
            "sqs message visibility change error"
        );
    }
}
