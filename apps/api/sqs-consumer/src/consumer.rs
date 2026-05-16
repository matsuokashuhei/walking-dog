use std::{collections::HashSet, sync::Arc};

use aws_sdk_sqs::types::{DeleteMessageBatchRequestEntry, Message};
use futures::{StreamExt, stream::FuturesUnordered};
use tokio::{sync::watch, task::JoinSet};

use crate::{
    backend::{AwsSqsBackend, BackendError, SqsBackend},
    error::ConsumerError,
    handler::{BatchMessageHandler, BatchOutcome, HandleOutcome, MessageHandler},
    heartbeat::spawn_heartbeat,
    listener::{ConsumerListener, NoopListener},
    options::{ConsumerOptions, TerminateVisibility},
    shutdown::{ShutdownHandle, ShutdownState},
};

pub(crate) enum HandlerKind<H> {
    Message(Arc<H>),
    Batch(Arc<H>),
}

pub struct Consumer<H> {
    options: ConsumerOptions,
    backend: Arc<dyn SqsBackend>,
    handler: HandlerKind<H>,
    listener: Arc<dyn ConsumerListener>,
    shutdown_handle: ShutdownHandle,
    shutdown_rx: watch::Receiver<ShutdownState>,
}

impl<H> Consumer<H> {
    pub fn listener<L>(mut self, listener: L) -> Self
    where
        L: ConsumerListener,
    {
        self.listener = Arc::new(listener);
        self
    }

    pub fn shutdown_handle(&self) -> ShutdownHandle {
        self.shutdown_handle.clone()
    }

    async fn receive_once(&self) -> Result<Vec<Message>, ConsumerError> {
        self.backend
            .receive_messages(
                &self.options.queue_url,
                self.options.batch_size,
                self.options.wait_time_seconds,
                self.options.visibility_timeout,
            )
            .await
            .map_err(map_receive_error)
    }

    async fn delete_acked(&self, messages: &[Message]) -> Result<(), ConsumerError> {
        if !self.options.should_delete_messages || messages.is_empty() {
            return Ok(());
        }
        let entries = messages
            .iter()
            .enumerate()
            .map(|(index, message)| {
                let Some(receipt_handle) = message.receipt_handle() else {
                    return Err(ConsumerError::MissingReceiptHandle {
                        message_id: message.message_id().map(ToOwned::to_owned),
                    });
                };
                DeleteMessageBatchRequestEntry::builder()
                    .id(index.to_string())
                    .receipt_handle(receipt_handle)
                    .build()
                    .map_err(|error| ConsumerError::InvalidOptions(error.to_string()))
            })
            .collect::<Result<Vec<_>, _>>()?;

        self.backend
            .delete_message_batch(&self.options.queue_url, entries)
            .await
            .map_err(map_delete_error)
    }

    async fn terminate_visibility(&self, messages: &[Message]) -> Result<(), ConsumerError> {
        for message in messages {
            let timeout = match &self.options.terminate_visibility {
                TerminateVisibility::Off => continue,
                TerminateVisibility::Reset => 0,
                TerminateVisibility::Fixed(value) => *value,
                TerminateVisibility::Dynamic(resolver) => resolver(message),
            };
            let Some(receipt_handle) = message.receipt_handle() else {
                return Err(ConsumerError::MissingReceiptHandle {
                    message_id: message.message_id().map(ToOwned::to_owned),
                });
            };
            if let Err(error) = self
                .backend
                .change_message_visibility(&self.options.queue_url, receipt_handle, timeout)
                .await
            {
                self.listener.on_visibility_error(message, &error);
                return Err(map_visibility_error(error));
            }
        }
        Ok(())
    }

    async fn run_loop(mut self) -> Result<(), ConsumerError>
    where
        H: MessageHandler + BatchMessageHandler,
    {
        self.listener.on_started();
        loop {
            if *self.shutdown_rx.borrow() != ShutdownState::Running {
                break;
            }
            let messages = match self.receive_once().await {
                Ok(messages) => messages,
                Err(error) => {
                    self.listener.on_error(&error);
                    tokio::select! {
                        _ = tokio::time::sleep(self.options.receive_error_backoff) => {}
                        _ = self.shutdown_rx.changed() => {}
                    }
                    continue;
                }
            };
            if messages.is_empty() {
                self.listener.on_empty();
                continue;
            }
            for message in &messages {
                self.listener.on_message_received(message);
            }
            if let Err(error) = self.dispatch_and_ack(messages).await {
                self.listener.on_error(&error);
            }
            self.listener.on_response_processed();
        }
        if *self.shutdown_rx.borrow() == ShutdownState::Abort {
            self.listener.on_aborted();
        } else {
            let _polling_complete_wait_time = self.options.polling_complete_wait_time;
            self.listener.on_stopped();
        }
        Ok(())
    }

    async fn dispatch_and_ack(&self, messages: Vec<Message>) -> Result<(), ConsumerError>
    where
        H: MessageHandler + BatchMessageHandler,
    {
        match &self.handler {
            HandlerKind::Message(handler) => {
                self.dispatch_messages(handler.clone(), messages).await
            }
            HandlerKind::Batch(handler) => self.dispatch_batch(handler.clone(), messages).await,
        }
    }

    async fn dispatch_messages(
        &self,
        handler: Arc<H>,
        messages: Vec<Message>,
    ) -> Result<(), ConsumerError>
    where
        H: MessageHandler,
    {
        let mut futures = FuturesUnordered::new();
        for message in messages {
            let handler = handler.clone();
            let options = self.options.clone();
            let backend = self.backend.clone();
            let listener = self.listener.clone();
            futures.push(async move {
                let outcome =
                    handle_one(handler, backend, listener.clone(), options, message.clone()).await;
                (message, outcome)
            });
        }

        let mut acked = Vec::new();
        let mut nacked = Vec::new();
        while let Some((message, outcome)) = futures.next().await {
            match outcome {
                Ok(HandleOutcome::Ack) => acked.push(message),
                Ok(HandleOutcome::Nack) => nacked.push(message),
                Err(error) => {
                    self.listener.on_processing_error(&message, &error);
                    nacked.push(message);
                }
            }
        }
        if self.options.always_acknowledge {
            acked.extend(nacked);
            nacked = Vec::new();
        }
        self.terminate_visibility(&nacked).await?;
        self.delete_acked(&acked).await
    }

    async fn dispatch_batch(
        &self,
        handler: Arc<H>,
        messages: Vec<Message>,
    ) -> Result<(), ConsumerError>
    where
        H: BatchMessageHandler,
    {
        let heartbeat_handles = self.start_heartbeats(&messages);
        let result = if let Some(timeout) = self.options.handle_message_timeout {
            match tokio::time::timeout(timeout, handler.handle_batch(messages.clone())).await {
                Ok(result) => result.map_err(|error| ConsumerError::Processing(Box::new(error))),
                Err(_) => {
                    for message in &messages {
                        self.listener.on_timeout_error(message);
                    }
                    Err(ConsumerError::Timeout)
                }
            }
        } else {
            handler
                .handle_batch(messages.clone())
                .await
                .map_err(|error| ConsumerError::Processing(Box::new(error)))
        };
        stop_heartbeats(heartbeat_handles).await;

        let (mut acked, nacked) = match result {
            Ok(BatchOutcome::AckAll) => (messages.clone(), Vec::new()),
            Ok(BatchOutcome::NackAll) => (Vec::new(), messages.clone()),
            Ok(BatchOutcome::Partial { ack_message_ids }) => {
                let ids = ack_message_ids.into_iter().collect::<HashSet<_>>();
                let acked = messages
                    .iter()
                    .filter(|message| message.message_id().is_some_and(|id| ids.contains(id)))
                    .cloned()
                    .collect::<Vec<_>>();
                let nacked = messages
                    .iter()
                    .filter(|message| !message.message_id().is_some_and(|id| ids.contains(id)))
                    .cloned()
                    .collect::<Vec<_>>();
                (acked, nacked)
            }
            Err(error) => {
                for message in &messages {
                    self.listener.on_processing_error(message, &error);
                }
                if self.options.always_acknowledge {
                    (messages.clone(), Vec::new())
                } else {
                    self.terminate_visibility(&messages).await?;
                    return Err(error);
                }
            }
        };
        if !nacked.is_empty() {
            self.terminate_visibility(&nacked).await?;
        }
        if self.options.always_acknowledge {
            acked = messages;
        }
        self.delete_acked(&acked).await
    }

    fn start_heartbeats(
        &self,
        messages: &[Message],
    ) -> Vec<(
        tokio::sync::watch::Sender<bool>,
        tokio::task::JoinHandle<()>,
    )> {
        let Some(config) = &self.options.heartbeat else {
            return Vec::new();
        };
        let visibility_timeout = config
            .visibility_timeout
            .or(self.options.visibility_timeout)
            .expect("heartbeat validation requires visibility_timeout");
        messages
            .iter()
            .filter_map(|message| {
                spawn_heartbeat(
                    self.backend.clone(),
                    self.listener.clone(),
                    self.options.queue_url.clone(),
                    message.clone(),
                    config.interval,
                    visibility_timeout,
                )
            })
            .collect()
    }
}

impl<H> Consumer<H>
where
    H: MessageHandler + BatchMessageHandler,
{
    pub async fn run(self) -> Result<(), ConsumerError> {
        self.run_loop().await
    }

    pub async fn run_until_ctrl_c(self) -> Result<(), ConsumerError> {
        let shutdown = self.shutdown_handle();
        let task = tokio::spawn(async move { self.run().await });
        tokio::signal::ctrl_c()
            .await
            .map_err(ConsumerError::ShutdownSignal)?;
        shutdown.graceful();
        task.await.map_err(ConsumerError::Join)?
    }

    pub async fn run_once(&self) -> Result<(), ConsumerError> {
        let messages = self.receive_once().await?;
        if messages.is_empty() {
            self.listener.on_empty();
            return Ok(());
        }
        for message in &messages {
            self.listener.on_message_received(message);
        }
        let result = self.dispatch_and_ack(messages).await;
        self.listener.on_response_processed();
        result
    }
}

impl<H> Consumer<H>
where
    H: MessageHandler + BatchMessageHandler,
{
    pub fn with_handler(options: ConsumerOptions, handler: H) -> Result<Self, ConsumerError> {
        let client = options
            .sqs_client
            .clone()
            .ok_or_else(|| ConsumerError::InvalidOptions("sqs_client is required".into()))?;
        Ok(Self::new(
            options,
            Arc::new(AwsSqsBackend::new(client)),
            HandlerKind::Message(Arc::new(handler)),
        ))
    }

    pub fn with_batch_handler(options: ConsumerOptions, handler: H) -> Result<Self, ConsumerError> {
        let client = options
            .sqs_client
            .clone()
            .ok_or_else(|| ConsumerError::InvalidOptions("sqs_client is required".into()))?;
        Ok(Self::new(
            options,
            Arc::new(AwsSqsBackend::new(client)),
            HandlerKind::Batch(Arc::new(handler)),
        ))
    }

    fn new(
        options: ConsumerOptions,
        backend: Arc<dyn SqsBackend>,
        handler: HandlerKind<H>,
    ) -> Self {
        let (shutdown_handle, shutdown_rx) = ShutdownHandle::new();
        Self {
            options,
            backend,
            handler,
            listener: Arc::new(NoopListener),
            shutdown_handle,
            shutdown_rx,
        }
    }

    #[cfg(test)]
    pub(crate) fn with_test_backend(
        options: ConsumerOptions,
        backend: Arc<dyn SqsBackend>,
        handler: HandlerKind<H>,
    ) -> Self {
        Self::new(options, backend, handler)
    }
}

async fn handle_one<H>(
    handler: Arc<H>,
    backend: Arc<dyn SqsBackend>,
    listener: Arc<dyn ConsumerListener>,
    options: ConsumerOptions,
    message: Message,
) -> Result<HandleOutcome, ConsumerError>
where
    H: MessageHandler,
{
    let heartbeats = if let Some(config) = &options.heartbeat {
        let visibility_timeout = config
            .visibility_timeout
            .or(options.visibility_timeout)
            .expect("heartbeat validation requires visibility_timeout");
        spawn_heartbeat(
            backend,
            listener,
            options.queue_url.clone(),
            message.clone(),
            config.interval,
            visibility_timeout,
        )
        .into_iter()
        .collect()
    } else {
        Vec::new()
    };

    let result = if let Some(timeout) = options.handle_message_timeout {
        match tokio::time::timeout(timeout, handler.handle_message(message.clone())).await {
            Ok(result) => result.map_err(|error| ConsumerError::Processing(Box::new(error))),
            Err(_) => Err(ConsumerError::Timeout),
        }
    } else {
        handler
            .handle_message(message)
            .await
            .map_err(|error| ConsumerError::Processing(Box::new(error)))
    };
    stop_heartbeats(heartbeats).await;
    result
}

async fn stop_heartbeats(
    handles: Vec<(
        tokio::sync::watch::Sender<bool>,
        tokio::task::JoinHandle<()>,
    )>,
) {
    let mut joins = JoinSet::new();
    for (stop, handle) in handles {
        let _ = stop.send(true);
        joins.spawn(async move {
            let _ = handle.await;
        });
    }
    while joins.join_next().await.is_some() {}
}

fn map_receive_error(error: BackendError) -> ConsumerError {
    ConsumerError::ReceiveMessage(Box::new(error))
}

fn map_delete_error(error: BackendError) -> ConsumerError {
    ConsumerError::DeleteMessageBatch(Box::new(error))
}

fn map_visibility_error(error: BackendError) -> ConsumerError {
    ConsumerError::ChangeMessageVisibility(Box::new(error))
}

#[cfg(test)]
mod tests {
    use std::{collections::VecDeque, sync::Arc, time::Duration};

    use async_trait::async_trait;
    use tokio::sync::Mutex;

    use super::*;
    use crate::{options::ConsumerOptions, options::HeartbeatConfig};

    #[derive(Default)]
    struct MockBackend {
        receives: Mutex<VecDeque<Result<Vec<Message>, BackendError>>>,
        deleted: Mutex<Vec<Vec<String>>>,
        visibility_changes: Mutex<Vec<(String, i32)>>,
        fail_delete: bool,
    }

    #[async_trait]
    impl SqsBackend for MockBackend {
        async fn receive_messages(
            &self,
            _queue_url: &str,
            _max_number_of_messages: i32,
            _wait_time_seconds: i32,
            _visibility_timeout: Option<i32>,
        ) -> Result<Vec<Message>, BackendError> {
            self.receives
                .lock()
                .await
                .pop_front()
                .unwrap_or_else(|| Ok(Vec::new()))
        }

        async fn delete_message_batch(
            &self,
            _queue_url: &str,
            entries: Vec<DeleteMessageBatchRequestEntry>,
        ) -> Result<(), BackendError> {
            if self.fail_delete {
                return Err(BackendError::Test("delete failed".into()));
            }
            self.deleted.lock().await.push(
                entries
                    .iter()
                    .map(|entry| entry.receipt_handle().to_owned())
                    .collect(),
            );
            Ok(())
        }

        async fn change_message_visibility(
            &self,
            _queue_url: &str,
            receipt_handle: &str,
            visibility_timeout: i32,
        ) -> Result<(), BackendError> {
            self.visibility_changes
                .lock()
                .await
                .push((receipt_handle.to_owned(), visibility_timeout));
            Ok(())
        }
    }

    struct TestHandler {
        batch_outcome: BatchOutcome,
        message_outcome: HandleOutcome,
        delay: Option<Duration>,
    }

    #[derive(Debug, thiserror::Error)]
    #[error("test handler error")]
    struct TestHandlerError;

    #[async_trait]
    impl MessageHandler for TestHandler {
        type Error = TestHandlerError;

        async fn handle_message(&self, _message: Message) -> Result<HandleOutcome, Self::Error> {
            if let Some(delay) = self.delay {
                tokio::time::sleep(delay).await;
            }
            Ok(self.message_outcome.clone())
        }
    }

    #[async_trait]
    impl BatchMessageHandler for TestHandler {
        type Error = TestHandlerError;

        async fn handle_batch(&self, _messages: Vec<Message>) -> Result<BatchOutcome, Self::Error> {
            if let Some(delay) = self.delay {
                tokio::time::sleep(delay).await;
            }
            Ok(self.batch_outcome.clone())
        }
    }

    fn message(id: &str, receipt: Option<&str>) -> Message {
        let mut builder = Message::builder().message_id(id).body("{}");
        if let Some(receipt) = receipt {
            builder = builder.receipt_handle(receipt);
        }
        builder.build()
    }

    fn options() -> ConsumerOptions {
        ConsumerOptions::builder()
            .queue_url("queue")
            .wait_time_seconds(0)
            .build_for_backend()
            .unwrap()
    }

    fn consumer(
        backend: Arc<MockBackend>,
        handler: TestHandler,
        options: ConsumerOptions,
    ) -> Consumer<TestHandler> {
        Consumer::with_test_backend(options, backend, HandlerKind::Batch(Arc::new(handler)))
    }

    #[tokio::test]
    async fn ack_all_deletes_all_receipt_handles() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1")), message("2", Some("r2"))]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: None,
        };

        consumer(backend.clone(), handler, options())
            .run_once()
            .await
            .unwrap();

        assert_eq!(*backend.deleted.lock().await, vec![vec!["r1", "r2"]]);
    }

    #[tokio::test]
    async fn partial_ack_deletes_only_selected_message_ids() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1")), message("2", Some("r2"))]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::Partial {
                ack_message_ids: vec!["2".into()],
            },
            message_outcome: HandleOutcome::Ack,
            delay: None,
        };

        consumer(backend.clone(), handler, options())
            .run_once()
            .await
            .unwrap();

        assert_eq!(*backend.deleted.lock().await, vec![vec!["r2"]]);
    }

    #[tokio::test]
    async fn missing_receipt_handle_surfaces_error() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", None)]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: None,
        };

        let error = consumer(backend, handler, options())
            .run_once()
            .await
            .unwrap_err();

        assert!(matches!(error, ConsumerError::MissingReceiptHandle { .. }));
    }

    #[tokio::test]
    async fn delete_batch_failure_surfaces_error() {
        let backend = Arc::new(MockBackend {
            fail_delete: true,
            ..MockBackend::default()
        });
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: None,
        };

        let error = consumer(backend, handler, options())
            .run_once()
            .await
            .unwrap_err();

        assert!(matches!(error, ConsumerError::DeleteMessageBatch(_)));
    }

    #[tokio::test]
    async fn nack_terminates_visibility_when_configured() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::NackAll,
            message_outcome: HandleOutcome::Ack,
            delay: None,
        };
        let options = ConsumerOptions::builder()
            .queue_url("queue")
            .wait_time_seconds(0)
            .terminate_visibility(TerminateVisibility::Reset)
            .build_for_backend()
            .unwrap();

        consumer(backend.clone(), handler, options)
            .run_once()
            .await
            .unwrap();

        assert_eq!(
            *backend.visibility_changes.lock().await,
            vec![("r1".into(), 0)]
        );
    }

    #[tokio::test(start_paused = true)]
    async fn heartbeat_extends_visibility_while_batch_is_processing() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: Some(Duration::from_secs(3)),
        };
        let options = ConsumerOptions::builder()
            .queue_url("queue")
            .wait_time_seconds(0)
            .visibility_timeout(10)
            .heartbeat(HeartbeatConfig {
                interval: Duration::from_secs(1),
                visibility_timeout: None,
            })
            .build_for_backend()
            .unwrap();

        consumer(backend.clone(), handler, options)
            .run_once()
            .await
            .unwrap();

        assert!(!backend.visibility_changes.lock().await.is_empty());
    }
}
