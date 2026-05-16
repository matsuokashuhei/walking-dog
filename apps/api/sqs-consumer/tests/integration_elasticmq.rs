use async_trait::async_trait;
use aws_sdk_sqs::types::Message;
use sqs_consumer::{BatchMessageHandler, BatchOutcome, Consumer, ConsumerOptions};

struct AckAllHandler;

#[derive(Debug, thiserror::Error)]
#[error("integration handler error")]
struct HandlerError;

#[async_trait]
impl BatchMessageHandler for AckAllHandler {
    type Error = HandlerError;

    async fn handle_batch(&self, _messages: Vec<Message>) -> Result<BatchOutcome, Self::Error> {
        Ok(BatchOutcome::AckAll)
    }
}

#[tokio::test]
async fn acked_messages_leave_elasticmq_queue() {
    let endpoint =
        std::env::var("AWS_SQS_ENDPOINT").unwrap_or_else(|_| "http://elasticmq:9324".to_owned());
    let config = aws_config::from_env().endpoint_url(endpoint).load().await;
    let client = aws_sdk_sqs::Client::new(&config);
    let queue_name = format!(
        "sqs-consumer-integration-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );
    let queue_url = client
        .create_queue()
        .queue_name(queue_name)
        .send()
        .await
        .unwrap()
        .queue_url()
        .unwrap()
        .to_owned();

    client
        .send_message()
        .queue_url(&queue_url)
        .message_body("one")
        .send()
        .await
        .unwrap();
    client
        .send_message()
        .queue_url(&queue_url)
        .message_body("two")
        .send()
        .await
        .unwrap();

    let options = ConsumerOptions::builder()
        .queue_url(queue_url.clone())
        .sqs_client(client.clone())
        .batch_size(10)
        .wait_time_seconds(0)
        .build()
        .unwrap();

    Consumer::with_batch_handler(options, AckAllHandler)
        .unwrap()
        .run_once()
        .await
        .unwrap();

    let remaining = client
        .receive_message()
        .queue_url(&queue_url)
        .max_number_of_messages(1)
        .wait_time_seconds(0)
        .send()
        .await
        .unwrap();
    assert!(remaining.messages().is_empty());
}
