use std::time::Duration;

use sqs_consumer::{ConsumerError, ConsumerOptions, HeartbeatConfig};

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
fn heartbeat_requires_visibility_timeout() {
    let error = build_error(
        ConsumerOptions::builder()
            .queue_url("http://localhost/queue")
            .heartbeat(HeartbeatConfig {
                interval: Duration::from_secs(1),
                visibility_timeout: None,
            }),
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
            .heartbeat(HeartbeatConfig {
                interval: Duration::from_secs(10),
                visibility_timeout: None,
            }),
    );
    assert!(
        matches!(error, ConsumerError::InvalidOptions(message) if message.contains("interval"))
    );
}
