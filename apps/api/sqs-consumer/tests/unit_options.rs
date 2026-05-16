use std::time::Duration;

use aws_sdk_sqs::types::MessageSystemAttributeName;
use sqs_consumer::{ConsumerError, ConsumerOptions, HeartbeatConfig};

fn sqs_client() -> aws_sdk_sqs::Client {
    let config = aws_sdk_sqs::Config::builder()
        .behavior_version_latest()
        .build();
    aws_sdk_sqs::Client::from_conf(config)
}

fn build_error(builder: sqs_consumer::ConsumerOptionsBuilder) -> ConsumerError {
    match builder.build() {
        Ok(_) => panic!("expected options build to fail"),
        Err(error) => error,
    }
}

#[test]
fn requires_queue_url() {
    let error = build_error(ConsumerOptions::builder());
    assert!(
        matches!(error, ConsumerError::InvalidOptions(message) if message.contains("queue_url"))
    );
}

#[test]
fn requires_sqs_client_for_public_build() {
    let error = build_error(ConsumerOptions::builder().queue_url("http://localhost/queue"));
    assert!(
        matches!(error, ConsumerError::InvalidOptions(message) if message.contains("sqs_client"))
    );
}

#[test]
fn validates_batch_size_range() {
    let error = build_error(
        ConsumerOptions::builder()
            .queue_url("http://localhost/queue")
            .batch_size(11),
    );
    assert!(
        matches!(error, ConsumerError::InvalidOptions(message) if message.contains("batch_size"))
    );
}

#[test]
fn validates_wait_time_range() {
    let error = build_error(
        ConsumerOptions::builder()
            .queue_url("http://localhost/queue")
            .wait_time_seconds(21),
    );
    assert!(
        matches!(error, ConsumerError::InvalidOptions(message) if message.contains("wait_time_seconds"))
    );
}

#[test]
fn heartbeat_config_uses_interval_and_extension_durations() {
    let heartbeat = HeartbeatConfig::new(Duration::from_secs(1)).extension(Duration::from_secs(5));

    assert_eq!(heartbeat.interval, Duration::from_secs(1));
    assert_eq!(heartbeat.extension, Some(Duration::from_secs(5)));
}

#[test]
fn builder_accepts_plan_aligned_polling_and_attribute_options() {
    ConsumerOptions::builder()
        .queue_url("http://localhost/queue")
        .sqs_client(sqs_client())
        .polling_wait_time(Duration::from_millis(50))
        .attribute_names(vec![MessageSystemAttributeName::ApproximateReceiveCount])
        .message_attribute_names(vec!["trace-id".to_string()])
        .suppress_fifo_warning(true)
        .heartbeat(HeartbeatConfig::new(Duration::from_secs(1)).extension(Duration::from_secs(5)))
        .build()
        .unwrap();
}

#[test]
fn heartbeat_requires_visibility_timeout() {
    let error = build_error(
        ConsumerOptions::builder()
            .queue_url("http://localhost/queue")
            .heartbeat(HeartbeatConfig::new(Duration::from_secs(1))),
    );
    assert!(
        matches!(error, ConsumerError::InvalidOptions(message) if message.contains("heartbeat requires"))
    );
}

#[test]
fn heartbeat_interval_must_be_less_than_visibility_timeout() {
    let error = build_error(
        ConsumerOptions::builder()
            .queue_url("http://localhost/queue")
            .visibility_timeout(10)
            .heartbeat(HeartbeatConfig::new(Duration::from_secs(10))),
    );
    assert!(
        matches!(error, ConsumerError::InvalidOptions(message) if message.contains("interval"))
    );
}
