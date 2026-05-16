use std::{collections::HashSet, sync::Arc};

use aws_sdk_sqs::types::{DeleteMessageBatchRequestEntry, Message};
use futures::{StreamExt, stream::FuturesUnordered};
use tokio::{sync::watch, task::JoinHandle};

use crate::{
    backend::{AwsSqsBackend, BackendError, SqsBackend},
    error::ConsumerError,
    handler::{BatchMessageHandler, BatchOutcome, HandleOutcome, MessageHandler},
    heartbeat::spawn_heartbeat,
    listener::{ConsumerListener, NoopListener},
    options::{ConsumerOptions, TerminateVisibility, validate_visibility_timeout},
    shutdown::{ShutdownHandle, ShutdownState},
};

#[async_trait::async_trait]
trait DynMessageHandler: Send + Sync {
    async fn handle_message(&self, message: Message) -> Result<HandleOutcome, ConsumerError>;
}

#[async_trait::async_trait]
impl<H> DynMessageHandler for H
where
    H: MessageHandler,
{
    async fn handle_message(&self, message: Message) -> Result<HandleOutcome, ConsumerError> {
        MessageHandler::handle_message(self, message)
            .await
            .map_err(|error| ConsumerError::Processing(Box::new(error)))
    }
}

#[async_trait::async_trait]
trait DynBatchHandler: Send + Sync {
    async fn ack_before_batch(&self, messages: &[Message]) -> Result<Vec<String>, ConsumerError>;
    async fn handle_batch(&self, messages: Vec<Message>) -> Result<BatchOutcome, ConsumerError>;
}

#[async_trait::async_trait]
impl<H> DynBatchHandler for H
where
    H: BatchMessageHandler,
{
    async fn ack_before_batch(&self, messages: &[Message]) -> Result<Vec<String>, ConsumerError> {
        BatchMessageHandler::ack_before_batch(self, messages)
            .await
            .map_err(|error| ConsumerError::Processing(Box::new(error)))
    }

    async fn handle_batch(&self, messages: Vec<Message>) -> Result<BatchOutcome, ConsumerError> {
        BatchMessageHandler::handle_batch(self, messages)
            .await
            .map_err(|error| ConsumerError::Processing(Box::new(error)))
    }
}

enum HandlerKind {
    Message(Arc<dyn DynMessageHandler>),
    Batch(Arc<dyn DynBatchHandler>),
}

pub struct Consumer {
    options: ConsumerOptions,
    backend: Arc<dyn SqsBackend>,
    handler: HandlerKind,
    listener: Arc<dyn ConsumerListener>,
    shutdown_handle: ShutdownHandle,
    shutdown_rx: watch::Receiver<ShutdownState>,
}

impl Consumer {
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
            validate_visibility_timeout("terminate_visibility", timeout)?;
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

    async fn run_loop(mut self) -> Result<(), ConsumerError> {
        self.listener.on_started();
        'running: loop {
            if *self.shutdown_rx.borrow() != ShutdownState::Running {
                break;
            }
            let messages = match self.receive_until_shutdown().await {
                Some(result) => match result {
                    Ok(messages) => messages,
                    Err(error) => {
                        self.listener.on_error(&error);
                        tokio::select! {
                            _ = tokio::time::sleep(self.options.receive_error_backoff) => {}
                            _ = self.shutdown_rx.changed() => {}
                        }
                        continue;
                    }
                },
                None => break,
            };
            if messages.is_empty() {
                self.listener.on_empty();
                continue;
            }
            for message in &messages {
                self.listener.on_message_received(message);
            }

            let dispatch = self.dispatch_and_ack(messages);
            let mut shutdown_rx = self.shutdown_rx.clone();
            tokio::pin!(dispatch);
            tokio::select! {
                result = &mut dispatch => {
                    if let Err(error) = result {
                        self.listener.on_error(&error);
                    }
                }
                changed = shutdown_rx.changed() => {
                    if changed.is_err() {
                        break 'running;
                    }
                    let shutdown_state = *shutdown_rx.borrow();
                    match shutdown_state {
                        ShutdownState::Abort => break 'running,
                        ShutdownState::Graceful => {
                            match tokio::time::timeout(
                                self.options.polling_complete_wait_time,
                                &mut dispatch,
                            )
                            .await
                            {
                                Ok(result) => {
                                    if let Err(error) = result {
                                        self.listener.on_error(&error);
                                    }
                                }
                                Err(_) => {
                                    self.listener.on_error(&ConsumerError::GracefulShutdownTimeout);
                                }
                            }
                            break 'running;
                        }
                        ShutdownState::Running => {}
                    }
                }
            }
            self.listener.on_response_processed();
        }
        if *self.shutdown_rx.borrow() == ShutdownState::Abort {
            self.listener.on_aborted();
        } else {
            self.listener.on_stopped();
        }
        Ok(())
    }

    async fn receive_until_shutdown(&self) -> Option<Result<Vec<Message>, ConsumerError>> {
        let mut shutdown_rx = self.shutdown_rx.clone();
        tokio::select! {
            result = self.receive_once() => Some(result),
            changed = shutdown_rx.changed() => {
                let _ = changed;
                None
            }
        }
    }

    async fn dispatch_and_ack(&self, messages: Vec<Message>) -> Result<(), ConsumerError> {
        match &self.handler {
            HandlerKind::Message(handler) => {
                self.dispatch_messages(handler.clone(), messages).await
            }
            HandlerKind::Batch(handler) => self.dispatch_batch(handler.clone(), messages).await,
        }
    }

    async fn dispatch_messages(
        &self,
        handler: Arc<dyn DynMessageHandler>,
        messages: Vec<Message>,
    ) -> Result<(), ConsumerError> {
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
                    if matches!(error, ConsumerError::Timeout) {
                        self.listener.on_timeout_error(&message);
                    } else {
                        self.listener.on_processing_error(&message, &error);
                    }
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
        handler: Arc<dyn DynBatchHandler>,
        messages: Vec<Message>,
    ) -> Result<(), ConsumerError> {
        let early_ack_ids = handler.ack_before_batch(&messages).await?;
        let early_ack_ids = validate_ack_ids(&messages, early_ack_ids)?;
        let (early_acked, messages) = partition_by_ack_ids(messages, &early_ack_ids);
        self.delete_acked(&early_acked).await?;
        if messages.is_empty() {
            return Ok(());
        }

        let heartbeat_handles = self.start_heartbeats(&messages);
        let result = if let Some(timeout) = self.options.handle_message_timeout {
            match tokio::time::timeout(timeout, handler.handle_batch(messages.clone())).await {
                Ok(result) => result,
                Err(_) => {
                    for message in &messages {
                        self.listener.on_timeout_error(message);
                    }
                    Err(ConsumerError::Timeout)
                }
            }
        } else {
            handler.handle_batch(messages.clone()).await
        };
        stop_heartbeats(heartbeat_handles).await;

        let (mut acked, nacked) = match result {
            Ok(BatchOutcome::AckAll) => (messages.clone(), Vec::new()),
            Ok(BatchOutcome::NackAll) => (Vec::new(), messages.clone()),
            Ok(BatchOutcome::Partial { ack_message_ids }) => {
                let ids = validate_ack_ids(&messages, ack_message_ids)?;
                partition_by_ack_ids(messages.clone(), &ids)
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

    fn start_heartbeats(&self, messages: &[Message]) -> HeartbeatGuard {
        let Some(config) = &self.options.heartbeat else {
            return HeartbeatGuard::default();
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

impl Consumer {
    pub async fn run(self) -> Result<(), ConsumerError> {
        self.run_loop().await
    }

    pub async fn run_until_ctrl_c(self) -> Result<(), ConsumerError> {
        let shutdown = self.shutdown_handle();
        let mut task = tokio::spawn(async move { self.run().await });
        tokio::select! {
            result = &mut task => result.map_err(ConsumerError::Join)?,
            signal = tokio::signal::ctrl_c() => {
                signal.map_err(ConsumerError::ShutdownSignal)?;
                shutdown.graceful();
                task.await.map_err(ConsumerError::Join)?
            }
        }
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

impl Consumer {
    pub fn with_handler<H>(options: ConsumerOptions, handler: H) -> Result<Self, ConsumerError>
    where
        H: MessageHandler,
    {
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

    pub fn with_batch_handler<H>(
        options: ConsumerOptions,
        handler: H,
    ) -> Result<Self, ConsumerError>
    where
        H: BatchMessageHandler,
    {
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

    fn new(options: ConsumerOptions, backend: Arc<dyn SqsBackend>, handler: HandlerKind) -> Self {
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
    fn with_test_backend(
        options: ConsumerOptions,
        backend: Arc<dyn SqsBackend>,
        handler: HandlerKind,
    ) -> Self {
        Self::new(options, backend, handler)
    }
}

fn validate_ack_ids(
    messages: &[Message],
    ack_message_ids: Vec<String>,
) -> Result<HashSet<String>, ConsumerError> {
    let message_ids = messages
        .iter()
        .filter_map(|message| message.message_id().map(ToOwned::to_owned))
        .collect::<HashSet<_>>();
    let mut ack_ids = HashSet::new();
    for ack_id in ack_message_ids {
        if !ack_ids.insert(ack_id.clone()) {
            return Err(ConsumerError::InvalidAck(format!(
                "duplicate message id {ack_id}"
            )));
        }
        if !message_ids.contains(&ack_id) {
            return Err(ConsumerError::InvalidAck(format!(
                "unknown message id {ack_id}"
            )));
        }
    }
    Ok(ack_ids)
}

fn partition_by_ack_ids(
    messages: Vec<Message>,
    ack_message_ids: &HashSet<String>,
) -> (Vec<Message>, Vec<Message>) {
    messages.into_iter().partition(|message| {
        message
            .message_id()
            .is_some_and(|id| ack_message_ids.contains(id))
    })
}

async fn handle_one(
    handler: Arc<dyn DynMessageHandler>,
    backend: Arc<dyn SqsBackend>,
    listener: Arc<dyn ConsumerListener>,
    options: ConsumerOptions,
    message: Message,
) -> Result<HandleOutcome, ConsumerError> {
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
        HeartbeatGuard::default()
    };

    let result = if let Some(timeout) = options.handle_message_timeout {
        match tokio::time::timeout(timeout, handler.handle_message(message.clone())).await {
            Ok(result) => result,
            Err(_) => Err(ConsumerError::Timeout),
        }
    } else {
        handler.handle_message(message).await
    };
    stop_heartbeats(heartbeats).await;
    result
}

#[derive(Default)]
struct HeartbeatGuard(Vec<(watch::Sender<bool>, JoinHandle<()>)>);

impl FromIterator<(watch::Sender<bool>, JoinHandle<()>)> for HeartbeatGuard {
    fn from_iter<T: IntoIterator<Item = (watch::Sender<bool>, JoinHandle<()>)>>(iter: T) -> Self {
        Self(iter.into_iter().collect())
    }
}

impl Drop for HeartbeatGuard {
    fn drop(&mut self) {
        for (stop, handle) in &mut self.0 {
            let _ = stop.send(true);
            handle.abort();
        }
    }
}

async fn stop_heartbeats(mut handles: HeartbeatGuard) {
    let handles = std::mem::take(&mut handles.0);
    for (stop, handle) in handles {
        let _ = stop.send(true);
        let _ = handle.await;
    }
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

    struct EarlyAckHandler {
        handled_message_ids: Arc<Mutex<Vec<Vec<String>>>>,
    }

    #[async_trait]
    impl BatchMessageHandler for EarlyAckHandler {
        type Error = TestHandlerError;

        async fn ack_before_batch(
            &self,
            _messages: &[Message],
        ) -> Result<Vec<String>, Self::Error> {
            Ok(vec!["invalid".into()])
        }

        async fn handle_batch(&self, messages: Vec<Message>) -> Result<BatchOutcome, Self::Error> {
            self.handled_message_ids.lock().await.push(
                messages
                    .iter()
                    .filter_map(|message| message.message_id().map(ToOwned::to_owned))
                    .collect(),
            );
            Ok(BatchOutcome::AckAll)
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
    ) -> Consumer {
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
    async fn pre_batch_ack_deletes_messages_before_handler_runs() {
        let backend = Arc::new(MockBackend::default());
        backend.receives.lock().await.push_back(Ok(vec![
            message("invalid", Some("invalid-receipt")),
            message("valid", Some("valid-receipt")),
        ]));
        let handled_message_ids = Arc::new(Mutex::new(Vec::new()));
        let handler = EarlyAckHandler {
            handled_message_ids: handled_message_ids.clone(),
        };

        Consumer::with_test_backend(
            options(),
            backend.clone(),
            HandlerKind::Batch(Arc::new(handler)),
        )
        .run_once()
        .await
        .unwrap();

        assert_eq!(
            *backend.deleted.lock().await,
            vec![vec!["invalid-receipt"], vec!["valid-receipt"]]
        );
        assert_eq!(*handled_message_ids.lock().await, vec![vec!["valid"]]);
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

    #[tokio::test(start_paused = true)]
    async fn abort_shutdown_cancels_in_flight_batch() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: Some(Duration::from_secs(3_600)),
        };
        let consumer = consumer(backend.clone(), handler, options());
        let shutdown = consumer.shutdown_handle();
        let task = tokio::spawn(consumer.run());

        tokio::task::yield_now().await;
        shutdown.abort();

        tokio::time::timeout(Duration::from_secs(1), task)
            .await
            .unwrap()
            .unwrap()
            .unwrap();
        assert!(backend.deleted.lock().await.is_empty());
    }
}
