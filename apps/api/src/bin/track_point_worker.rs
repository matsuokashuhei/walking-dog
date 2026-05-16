use std::{env, fmt, time::Duration};

use anyhow::Result;
use sqs_consumer::{Consumer, ConsumerOptions, TracingListener};
use tokio::task::JoinSet;
use walking_dog::queue::track_point::{
    DynamoDbTrackPointBatchWriter, TrackPointBatchHandler, TrackPointBatchWriter,
};

const DEFAULT_WORKER_CONCURRENCY: usize = 10;
const DEFAULT_BATCH_SIZE: i32 = 10;
const DEFAULT_VISIBILITY_TIMEOUT_SECONDS: i32 = 60;
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS: u64 = 30;
const DEFAULT_HANDLER_TIMEOUT_SECONDS: u64 = 50;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let sqs_client = build_sqs_client().await;
    let dynamodb_client = build_dynamodb_client().await;
    let queue_url = env::var("AWS_SQS_QUEUE_URL_TRACK_POINT")?;
    let worker_concurrency =
        positive_usize_env("TRACK_POINT_WORKER_CONCURRENCY", DEFAULT_WORKER_CONCURRENCY);
    let batch_size = sqs_batch_size_env("TRACK_POINT_WORKER_BATCH_SIZE", DEFAULT_BATCH_SIZE);
    let handler_timeout_seconds = positive_u64_env(
        "TRACK_POINT_HANDLER_TIMEOUT_SECONDS",
        DEFAULT_HANDLER_TIMEOUT_SECONDS,
    );

    let options = ConsumerOptions::builder()
        .queue_url(queue_url)
        .sqs_client(sqs_client)
        .batch_size(batch_size)
        .wait_time_seconds(20)
        .visibility_timeout(DEFAULT_VISIBILITY_TIMEOUT_SECONDS)
        .handle_message_timeout(Duration::from_secs(handler_timeout_seconds))
        .heartbeat(sqs_consumer::HeartbeatConfig::new(Duration::from_secs(
            DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
        )))
        .build()?;
    let handler = TrackPointBatchHandler::new(DynamoDbTrackPointBatchWriter::new(dynamodb_client));

    run_consumers(options, handler, worker_concurrency).await?;

    Ok(())
}

async fn run_consumers<W>(
    options: ConsumerOptions,
    handler: TrackPointBatchHandler<W>,
    worker_concurrency: usize,
) -> Result<()>
where
    W: TrackPointBatchWriter + Clone,
{
    let mut tasks = JoinSet::new();
    let mut shutdown_handles = Vec::with_capacity(worker_concurrency);

    for worker_index in 0..worker_concurrency {
        let consumer = Consumer::with_batch_handler(options.clone(), handler.clone())?
            .listener(TracingListener);
        shutdown_handles.push(consumer.shutdown_handle());
        tasks.spawn(async move {
            tracing::info!(worker_index, "track point consumer started");
            consumer.run().await
        });
    }

    loop {
        tokio::select! {
            signal = sqs_consumer::shutdown_signal() => {
                signal?;
                tracing::info!("graceful shutdown triggered");
                for shutdown in &shutdown_handles {
                    shutdown.graceful();
                }
                break;
            }
            result = tasks.join_next(), if !tasks.is_empty() => {
                match result {
                    Some(Ok(Ok(()))) => {
                        if tasks.is_empty() {
                            return Ok(());
                        }
                    }
                    Some(Ok(Err(error))) => {
                        for shutdown in &shutdown_handles {
                            shutdown.abort();
                        }
                        return Err(error.into());
                    }
                    Some(Err(error)) => {
                        for shutdown in &shutdown_handles {
                            shutdown.abort();
                        }
                        return Err(error.into());
                    }
                    None => return Ok(()),
                }
            }
        }
    }

    while let Some(result) = tasks.join_next().await {
        result??;
    }

    Ok(())
}

fn positive_usize_env(name: &str, default: usize) -> usize {
    let value = env::var(name).ok();
    positive_usize_env_value(name, value.as_deref(), default)
}

fn positive_usize_env_value(name: &str, value: Option<&str>, default: usize) -> usize {
    let Some(value) = value else {
        return default;
    };
    match value.parse::<usize>() {
        Ok(parsed) if parsed > 0 => parsed,
        _ => {
            warn_invalid_env_value(name, value, default);
            default
        }
    }
}

fn positive_u64_env(name: &str, default: u64) -> u64 {
    let value = env::var(name).ok();
    positive_u64_env_value(name, value.as_deref(), default)
}

fn positive_u64_env_value(name: &str, value: Option<&str>, default: u64) -> u64 {
    let Some(value) = value else {
        return default;
    };
    match value.parse::<u64>() {
        Ok(parsed) if parsed > 0 => parsed,
        _ => {
            warn_invalid_env_value(name, value, default);
            default
        }
    }
}

fn sqs_batch_size_env(name: &str, default: i32) -> i32 {
    let value = env::var(name).ok();
    sqs_batch_size_env_value(name, value.as_deref(), default)
}

fn sqs_batch_size_env_value(name: &str, value: Option<&str>, default: i32) -> i32 {
    let Some(value) = value else {
        return default;
    };
    match value.parse::<i32>() {
        Ok(parsed) if (1..=10).contains(&parsed) => parsed,
        _ => {
            warn_invalid_env_value(name, value, default);
            default
        }
    }
}

fn warn_invalid_env_value<T>(name: &str, value: &str, default: T)
where
    T: fmt::Display,
{
    tracing::warn!(
        env_var = name,
        value,
        default = %default,
        "invalid environment variable, using default"
    );
}

async fn build_dynamodb_client() -> aws_sdk_dynamodb::Client {
    let config_loader = aws_config::from_env();
    let config = match env::var("AWS_DYNAMODB_ENDPOINT") {
        Ok(endpoint) => config_loader.endpoint_url(endpoint).load().await,
        Err(_) => config_loader.load().await,
    };
    aws_sdk_dynamodb::Client::new(&config)
}

async fn build_sqs_client() -> aws_sdk_sqs::Client {
    let config_loader = aws_config::from_env();
    let config = match env::var("AWS_SQS_ENDPOINT") {
        Ok(endpoint) => config_loader.endpoint_url(endpoint).load().await,
        Err(_) => config_loader.load().await,
    };
    aws_sdk_sqs::Client::new(&config)
}

#[cfg(test)]
mod tests {
    use std::{
        io::{Result as IoResult, Write},
        sync::{Arc, Mutex},
    };

    use tracing_subscriber::fmt::MakeWriter;

    use super::*;

    #[test]
    fn positive_env_helpers_read_valid_values() {
        assert_eq!(positive_usize_env_value("TEST_USIZE", Some("5"), 10), 5);
        assert_eq!(positive_u64_env_value("TEST_U64", Some("6"), 10), 6);
        assert_eq!(sqs_batch_size_env_value("TEST_BATCH", Some("7"), 10), 7);
    }

    #[test]
    fn invalid_env_helpers_use_defaults_and_warn() {
        let output = capture_warnings(|| {
            assert_eq!(positive_usize_env_value("TEST_USIZE", Some("foo"), 10), 10);
            assert_eq!(positive_u64_env_value("TEST_U64", Some("0"), 10), 10);
            assert_eq!(sqs_batch_size_env_value("TEST_BATCH", Some("11"), 10), 10);
        });

        assert!(output.contains("TEST_USIZE"));
        assert!(output.contains("TEST_U64"));
        assert!(output.contains("TEST_BATCH"));
    }

    fn capture_warnings(run: impl FnOnce()) -> String {
        let output = Arc::new(Mutex::new(Vec::new()));
        let subscriber = tracing_subscriber::fmt()
            .with_max_level(tracing::Level::WARN)
            .with_writer(BufferMakeWriter(output.clone()))
            .without_time()
            .finish();

        tracing::subscriber::with_default(subscriber, run);

        String::from_utf8(output.lock().unwrap().clone()).unwrap()
    }

    #[derive(Clone)]
    struct BufferMakeWriter(Arc<Mutex<Vec<u8>>>);

    impl<'a> MakeWriter<'a> for BufferMakeWriter {
        type Writer = BufferWriter;

        fn make_writer(&'a self) -> Self::Writer {
            BufferWriter(self.0.clone())
        }
    }

    struct BufferWriter(Arc<Mutex<Vec<u8>>>);

    impl Write for BufferWriter {
        fn write(&mut self, buf: &[u8]) -> IoResult<usize> {
            self.0.lock().unwrap().extend_from_slice(buf);
            Ok(buf.len())
        }

        fn flush(&mut self) -> IoResult<()> {
            Ok(())
        }
    }
}
