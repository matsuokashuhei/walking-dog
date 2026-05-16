use std::{sync::Arc, time::Duration};

use aws_sdk_sqs::{Client, types::MessageSystemAttributeName};

use crate::error::ConsumerError;

const DEFAULT_BATCH_SIZE: i32 = 10;
const DEFAULT_WAIT_TIME_SECONDS: i32 = 20;
const MAX_VISIBILITY_TIMEOUT_SECONDS: i32 = 43_200;

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
    pub(crate) polling_wait_time: Duration,
    pub(crate) attribute_names: Vec<MessageSystemAttributeName>,
    pub(crate) message_attribute_names: Vec<String>,
    pub(crate) suppress_fifo_warning: bool,
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
    pub extension: Option<Duration>,
}

impl HeartbeatConfig {
    pub fn new(interval: Duration) -> Self {
        Self {
            interval,
            extension: None,
        }
    }

    pub fn extension(mut self, extension: Duration) -> Self {
        self.extension = Some(extension);
        self
    }
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
    polling_wait_time: Duration,
    attribute_names: Vec<MessageSystemAttributeName>,
    message_attribute_names: Vec<String>,
    suppress_fifo_warning: bool,
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
            receive_error_backoff: Duration::from_secs(10),
            polling_wait_time: Duration::ZERO,
            attribute_names: Vec::new(),
            message_attribute_names: Vec::new(),
            suppress_fifo_warning: false,
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

    pub fn polling_wait_time(mut self, polling_wait_time: Duration) -> Self {
        self.polling_wait_time = polling_wait_time;
        self
    }

    pub fn attribute_names(mut self, attribute_names: Vec<MessageSystemAttributeName>) -> Self {
        self.attribute_names = attribute_names;
        self
    }

    pub fn message_attribute_names(mut self, message_attribute_names: Vec<String>) -> Self {
        self.message_attribute_names = message_attribute_names;
        self
    }

    pub fn suppress_fifo_warning(mut self, suppress_fifo_warning: bool) -> Self {
        self.suppress_fifo_warning = suppress_fifo_warning;
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
        if let Some(visibility_timeout) = self.visibility_timeout {
            validate_visibility_timeout("visibility_timeout", visibility_timeout)?;
        }
        if let TerminateVisibility::Fixed(visibility_timeout) = &self.terminate_visibility {
            validate_visibility_timeout("terminate_visibility", *visibility_timeout)?;
        }
        if let Some(heartbeat) = &self.heartbeat {
            if heartbeat.interval.is_zero() {
                return Err(ConsumerError::InvalidOptions(
                    "heartbeat interval must be greater than zero".into(),
                ));
            }
            let extension = heartbeat_extension_duration(heartbeat, self.visibility_timeout)?;
            if extension.is_zero() {
                return Err(ConsumerError::InvalidVisibilityTimeout {
                    field: "heartbeat.extension",
                    value: 0,
                });
            }
            if heartbeat.interval >= extension {
                return Err(ConsumerError::InvalidOptions(
                    "heartbeat interval must be less than heartbeat extension".into(),
                ));
            }
            let _ = duration_to_visibility_timeout("heartbeat.extension", extension)?;
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
            polling_wait_time: self.polling_wait_time,
            attribute_names: self.attribute_names,
            message_attribute_names: self.message_attribute_names,
            suppress_fifo_warning: self.suppress_fifo_warning,
            handle_message_timeout: self.handle_message_timeout,
            terminate_visibility: self.terminate_visibility,
            heartbeat: self.heartbeat,
            polling_complete_wait_time: self.polling_complete_wait_time,
        })
    }
}

pub(crate) fn validate_visibility_timeout(
    field: &'static str,
    value: i32,
) -> Result<(), ConsumerError> {
    if !(0..=MAX_VISIBILITY_TIMEOUT_SECONDS).contains(&value) {
        return Err(ConsumerError::InvalidVisibilityTimeout { field, value });
    }
    Ok(())
}

pub(crate) fn resolve_heartbeat_visibility_timeout(
    heartbeat: &HeartbeatConfig,
    visibility_timeout: Option<i32>,
) -> Result<i32, ConsumerError> {
    let extension = heartbeat_extension_duration(heartbeat, visibility_timeout)?;
    duration_to_visibility_timeout("heartbeat.extension", extension)
}

fn heartbeat_extension_duration(
    heartbeat: &HeartbeatConfig,
    visibility_timeout: Option<i32>,
) -> Result<Duration, ConsumerError> {
    if let Some(extension) = heartbeat.extension {
        return Ok(extension);
    }
    let Some(visibility_timeout) = visibility_timeout else {
        return Err(ConsumerError::InvalidOptions(
            "heartbeat requires visibility_timeout".into(),
        ));
    };
    Ok(Duration::from_secs(visibility_timeout as u64))
}

fn duration_to_visibility_timeout(
    field: &'static str,
    duration: Duration,
) -> Result<i32, ConsumerError> {
    let seconds = duration
        .as_secs()
        .saturating_add(u64::from(duration.subsec_nanos() > 0));
    let value = i32::try_from(seconds).unwrap_or(i32::MAX);
    validate_visibility_timeout(field, value)?;
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_match_plan_aligned_options() {
        let options = ConsumerOptions::builder()
            .queue_url("queue")
            .build_for_backend()
            .unwrap();

        assert_eq!(options.receive_error_backoff, Duration::from_secs(10));
        assert_eq!(options.polling_wait_time, Duration::ZERO);
        assert!(options.attribute_names.is_empty());
        assert!(options.message_attribute_names.is_empty());
        assert!(!options.suppress_fifo_warning);
    }
}
