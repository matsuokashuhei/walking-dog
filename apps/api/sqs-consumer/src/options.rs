use std::{sync::Arc, time::Duration};

use aws_sdk_sqs::Client;

use crate::error::ConsumerError;

const DEFAULT_BATCH_SIZE: i32 = 10;
const DEFAULT_WAIT_TIME_SECONDS: i32 = 20;

#[derive(Clone)]
pub struct ConsumerOptions {
    pub(crate) queue_url: String,
    pub(crate) sqs_client: Option<Client>,
    pub(crate) batch_size: i32,
    pub(crate) wait_time_seconds: i32,
    pub(crate) visibility_timeout: Option<i32>,
    pub(crate) should_delete_messages: bool,
    pub(crate) always_acknowledge: bool,
    pub(crate) receive_error_backoff: Duration,
    pub(crate) handle_message_timeout: Option<Duration>,
    pub(crate) terminate_visibility: TerminateVisibility,
    pub(crate) heartbeat: Option<HeartbeatConfig>,
    pub(crate) polling_complete_wait_time: Duration,
}

impl ConsumerOptions {
    pub fn builder() -> ConsumerOptionsBuilder {
        ConsumerOptionsBuilder::default()
    }
}

#[derive(Clone)]
pub struct HeartbeatConfig {
    pub interval: Duration,
    pub visibility_timeout: Option<i32>,
}

#[derive(Clone, Default)]
pub enum TerminateVisibility {
    #[default]
    Off,
    Reset,
    Fixed(i32),
    Dynamic(Arc<dyn Fn(&aws_sdk_sqs::types::Message) -> i32 + Send + Sync>),
}

pub struct ConsumerOptionsBuilder {
    queue_url: Option<String>,
    sqs_client: Option<Client>,
    batch_size: i32,
    wait_time_seconds: i32,
    visibility_timeout: Option<i32>,
    should_delete_messages: bool,
    always_acknowledge: bool,
    receive_error_backoff: Duration,
    handle_message_timeout: Option<Duration>,
    terminate_visibility: TerminateVisibility,
    heartbeat: Option<HeartbeatConfig>,
    polling_complete_wait_time: Duration,
}

impl Default for ConsumerOptionsBuilder {
    fn default() -> Self {
        Self {
            queue_url: None,
            sqs_client: None,
            batch_size: DEFAULT_BATCH_SIZE,
            wait_time_seconds: DEFAULT_WAIT_TIME_SECONDS,
            visibility_timeout: None,
            should_delete_messages: true,
            always_acknowledge: false,
            receive_error_backoff: Duration::from_secs(1),
            handle_message_timeout: None,
            terminate_visibility: TerminateVisibility::Off,
            heartbeat: None,
            polling_complete_wait_time: Duration::from_secs(30),
        }
    }
}

impl ConsumerOptionsBuilder {
    pub fn queue_url(mut self, queue_url: impl Into<String>) -> Self {
        self.queue_url = Some(queue_url.into());
        self
    }

    pub fn sqs_client(mut self, sqs_client: Client) -> Self {
        self.sqs_client = Some(sqs_client);
        self
    }

    pub fn batch_size(mut self, batch_size: i32) -> Self {
        self.batch_size = batch_size;
        self
    }

    pub fn wait_time_seconds(mut self, wait_time_seconds: i32) -> Self {
        self.wait_time_seconds = wait_time_seconds;
        self
    }

    pub fn visibility_timeout(mut self, visibility_timeout: i32) -> Self {
        self.visibility_timeout = Some(visibility_timeout);
        self
    }

    pub fn should_delete_messages(mut self, should_delete_messages: bool) -> Self {
        self.should_delete_messages = should_delete_messages;
        self
    }

    pub fn always_acknowledge(mut self, always_acknowledge: bool) -> Self {
        self.always_acknowledge = always_acknowledge;
        self
    }

    pub fn receive_error_backoff(mut self, receive_error_backoff: Duration) -> Self {
        self.receive_error_backoff = receive_error_backoff;
        self
    }

    pub fn handle_message_timeout(mut self, handle_message_timeout: Duration) -> Self {
        self.handle_message_timeout = Some(handle_message_timeout);
        self
    }

    pub fn terminate_visibility(mut self, terminate_visibility: TerminateVisibility) -> Self {
        self.terminate_visibility = terminate_visibility;
        self
    }

    pub fn heartbeat(mut self, heartbeat: HeartbeatConfig) -> Self {
        self.heartbeat = Some(heartbeat);
        self
    }

    pub fn polling_complete_wait_time(mut self, polling_complete_wait_time: Duration) -> Self {
        self.polling_complete_wait_time = polling_complete_wait_time;
        self
    }

    pub fn build(self) -> Result<ConsumerOptions, ConsumerError> {
        self.build_with_client_requirement(true)
    }

    #[cfg(test)]
    pub(crate) fn build_for_backend(self) -> Result<ConsumerOptions, ConsumerError> {
        self.build_with_client_requirement(false)
    }

    fn build_with_client_requirement(
        self,
        require_client: bool,
    ) -> Result<ConsumerOptions, ConsumerError> {
        let Some(queue_url) = self.queue_url.filter(|value| !value.is_empty()) else {
            return Err(ConsumerError::InvalidOptions(
                "queue_url is required".into(),
            ));
        };
        if !(1..=10).contains(&self.batch_size) {
            return Err(ConsumerError::InvalidOptions(
                "batch_size must be between 1 and 10".into(),
            ));
        }
        if !(0..=20).contains(&self.wait_time_seconds) {
            return Err(ConsumerError::InvalidOptions(
                "wait_time_seconds must be between 0 and 20".into(),
            ));
        }
        if let Some(heartbeat) = &self.heartbeat {
            let Some(visibility_timeout) = self.visibility_timeout else {
                return Err(ConsumerError::InvalidOptions(
                    "heartbeat requires visibility_timeout".into(),
                ));
            };
            if heartbeat.interval >= Duration::from_secs(visibility_timeout as u64) {
                return Err(ConsumerError::InvalidOptions(
                    "heartbeat interval must be less than visibility_timeout".into(),
                ));
            }
        }
        if require_client && self.sqs_client.is_none() {
            return Err(ConsumerError::InvalidOptions(
                "sqs_client is required".into(),
            ));
        }

        Ok(ConsumerOptions {
            queue_url,
            sqs_client: self.sqs_client,
            batch_size: self.batch_size,
            wait_time_seconds: self.wait_time_seconds,
            visibility_timeout: self.visibility_timeout,
            should_delete_messages: self.should_delete_messages,
            always_acknowledge: self.always_acknowledge,
            receive_error_backoff: self.receive_error_backoff,
            handle_message_timeout: self.handle_message_timeout,
            terminate_visibility: self.terminate_visibility,
            heartbeat: self.heartbeat,
            polling_complete_wait_time: self.polling_complete_wait_time,
        })
    }
}
