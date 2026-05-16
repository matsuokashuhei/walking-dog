use std::{collections::HashSet, pin::Pin, sync::Arc};

use aws_sdk_sqs::types::Message;
use futures::{StreamExt, stream::FuturesUnordered};
use tokio::{
    sync::{mpsc, watch},
    time::{Sleep, sleep},
};

use crate::{
    backend::{AwsSqsBackend, BackendError, SqsBackend},
    error::ConsumerError,
    handler::{BatchMessageHandler, BatchOutcome, HandleOutcome, MessageHandler},
    heartbeat::{HeartbeatTask, spawn_heartbeat, spawn_heartbeat_with_failure_channel},
    listener::{ConsumerListener, NoopListener},
    options::{
        ConsumerOptions, TerminateVisibility, resolve_heartbeat_visibility_timeout,
        validate_visibility_timeout,
    },
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
        self.listener.on_polling_started();
        let result = self
            .backend
            .receive_messages(
                &self.options.queue_url,
                self.options.batch_size,
                self.options.wait_time_seconds,
                self.options.visibility_timeout,
                &self.options.attribute_names,
                &self.options.message_attribute_names,
            )
            .await
            .map_err(map_receive_error);
        self.listener.on_polling_completed();
        result
    }

    async fn delete_acked(&self, messages: &[Message]) -> Result<(), ConsumerError> {
        if !self.options.should_delete_messages || messages.is_empty() {
            return Ok(());
        }
        let message_ids = message_ids(messages);
        let entries = messages
            .iter()
            .enumerate()
            .map(|(index, message)| {
                let Some(receipt_handle) = message.receipt_handle() else {
                    return Err(ConsumerError::MissingReceiptHandle {
                        message_id: message.message_id().map(ToOwned::to_owned),
                    });
                };
                Ok((index.to_string(), receipt_handle.to_owned()))
            })
            .collect::<Result<Vec<_>, _>>()?;

        self.backend
            .delete_message_batch(&self.options.queue_url, entries)
            .await
            .map_err(|error| map_delete_error(error, &message_ids))
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
        let mut aborted_message_ids = Vec::new();
        'running: loop {
            if *self.shutdown_rx.borrow() != ShutdownState::Running {
                break;
            }
            let messages = match self.receive_until_shutdown().await {
                Some(result) => match result {
                    Ok(messages) => messages,
                    Err(error) => {
                        self.listener.on_error(&error, None);
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
                if !self.wait_for_polling().await {
                    break;
                }
                continue;
            }
            let message_count = messages.len();
            for message in &messages {
                self.listener.on_message_received(message);
            }

            let result = self.dispatch_and_ack(messages.clone()).await;
            if result.is_ok() {
                self.notify_messages_processed(&messages);
            }
            if let Err(error) = result {
                if let ConsumerError::Aborted { message_ids } = &error {
                    aborted_message_ids = message_ids.clone();
                    break 'running;
                }
                self.listener.on_error(&error, None);
            }
            self.listener.on_response_processed(message_count);
            if *self.shutdown_rx.borrow() != ShutdownState::Running {
                break;
            }
        }
        if *self.shutdown_rx.borrow() == ShutdownState::Abort {
            self.listener.on_aborted(&aborted_message_ids);
        } else {
            self.listener.on_stopped();
        }
        Ok(())
    }

    async fn wait_for_polling(&self) -> bool {
        if self.options.polling_wait_time.is_zero() {
            return true;
        }
        self.listener.on_waiting_for_polling();
        let mut shutdown_rx = self.shutdown_rx.clone();
        tokio::select! {
            _ = sleep(self.options.polling_wait_time) => {
                self.listener.on_polling_wait_exceeded();
                true
            }
            changed = shutdown_rx.changed() => {
                let _ = changed;
                false
            }
        }
    }

    fn notify_messages_processed(&self, messages: &[Message]) {
        for message in messages {
            self.listener.on_message_processed(message);
        }
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
        let early_ack_ids = match handler.ack_before_batch(&messages).await {
            Ok(ack_ids) => ack_ids,
            Err(error) => {
                self.listener.on_error(&error, Some(&messages));
                return Err(error);
            }
        };
        let early_ack_ids = validate_ack_ids(&messages, early_ack_ids)?;
        let (early_acked, messages) = partition_by_ack_ids(messages, &early_ack_ids);
        self.delete_acked(&early_acked).await?;
        if messages.is_empty() {
            return Ok(());
        }

        let mut heartbeat_handles = self.start_heartbeats(&messages)?;
        let result = self
            .run_batch_handler_until_terminal_state(
                handler,
                messages.clone(),
                &mut heartbeat_handles,
            )
            .await;
        stop_heartbeats(heartbeat_handles, self.listener.clone()).await;

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

    async fn run_batch_handler_until_terminal_state(
        &self,
        handler: Arc<dyn DynBatchHandler>,
        messages: Vec<Message>,
        heartbeats: &mut HeartbeatGuard,
    ) -> Result<BatchOutcome, ConsumerError> {
        let message_ids = message_ids(&messages);
        let handler_messages = messages.clone();
        let mut handler_task =
            tokio::spawn(async move { handler.handle_batch(handler_messages).await });
        let mut shutdown_rx = self.shutdown_rx.clone();
        let mut handler_timeout = self
            .options
            .handle_message_timeout
            .map(|duration| Box::pin(sleep(duration)));
        let mut graceful_timeout: Option<Pin<Box<Sleep>>> = None;

        loop {
            tokio::select! {
                result = &mut handler_task => {
                    return result.map_err(ConsumerError::Join)?;
                }
                _ = async {
                    if let Some(timeout) = &mut handler_timeout {
                        timeout.as_mut().await;
                    }
                }, if handler_timeout.is_some() => {
                    handler_task.abort();
                    for message in &messages {
                        self.listener.on_timeout_error(message);
                    }
                    return Err(ConsumerError::Timeout);
                }
                changed = shutdown_rx.changed() => {
                    if changed.is_err() {
                        continue;
                    }
                    match *shutdown_rx.borrow() {
                        ShutdownState::Running => {}
                        ShutdownState::Graceful => {
                            if graceful_timeout.is_none() {
                                graceful_timeout = Some(Box::pin(sleep(self.options.polling_complete_wait_time)));
                            }
                        }
                        ShutdownState::Abort => {
                            handler_task.abort();
                            return Err(ConsumerError::Aborted { message_ids });
                        }
                    }
                }
                _ = async {
                    if let Some(timeout) = &mut graceful_timeout {
                        timeout.as_mut().await;
                    }
                }, if graceful_timeout.is_some() => {
                    let error = ConsumerError::GracefulShutdownTimeout {
                        message_ids: message_ids.clone(),
                    };
                    self.listener.on_error(&error, Some(&messages));
                    graceful_timeout = None;
                }
                failed_message_id = heartbeats.recv_failure(), if heartbeats.has_failure_channel() => {
                    let message_id = failed_message_id.expect("heartbeat failure channel should be open while tasks run");
                    handler_task.abort();
                    return Err(ConsumerError::HeartbeatFailed { message_id });
                }
            }
        }
    }

    fn start_heartbeats(&self, messages: &[Message]) -> Result<HeartbeatGuard, ConsumerError> {
        let Some(config) = &self.options.heartbeat else {
            return Ok(HeartbeatGuard::default());
        };
        let visibility_timeout =
            resolve_heartbeat_visibility_timeout(config, self.options.visibility_timeout)?;
        let (failure_tx, failure_rx) = mpsc::unbounded_channel();
        Ok(HeartbeatGuard {
            tasks: messages
                .iter()
                .filter_map(|message| {
                    let receipt_handle = message.receipt_handle()?.to_owned();
                    let message_id = message.message_id().unwrap_or(&receipt_handle).to_owned();
                    let (stop_tx, stop_rx) = watch::channel(false);
                    spawn_heartbeat_with_failure_channel(
                        self.backend.clone(),
                        self.listener.clone(),
                        self.options.queue_url.clone(),
                        message.clone(),
                        receipt_handle,
                        message_id,
                        config.interval,
                        visibility_timeout,
                        stop_tx,
                        stop_rx,
                        failure_tx.clone(),
                    )
                })
                .collect(),
            failure_rx: Some(failure_rx),
        })
    }
}

impl Consumer {
    pub async fn run(self) -> Result<(), ConsumerError> {
        self.run_loop().await
    }

    pub async fn run_until_shutdown_signal(self) -> Result<(), ConsumerError> {
        let shutdown = self.shutdown_handle();
        let mut task = tokio::spawn(async move { self.run().await });
        tokio::select! {
            result = &mut task => result.map_err(ConsumerError::Join)?,
            signal = shutdown_signal() => {
                signal.map_err(ConsumerError::ShutdownSignal)?;
                tracing::info!("graceful shutdown triggered");
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
        let message_count = messages.len();
        for message in &messages {
            self.listener.on_message_received(message);
        }
        let result = self.dispatch_and_ack(messages.clone()).await;
        if result.is_ok() {
            self.notify_messages_processed(&messages);
        }
        self.listener.on_response_processed(message_count);
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
        warn_if_fifo_queue(&options);
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
        warn_if_fifo_queue(&options);
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

fn warn_if_fifo_queue(options: &ConsumerOptions) {
    if !options.suppress_fifo_warning && options.queue_url.ends_with(".fifo") {
        tracing::warn!(
            queue_url = %options.queue_url,
            "sqs-consumer does not provide FIFO-specific ordering guarantees"
        );
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

fn message_ids(messages: &[Message]) -> Vec<String> {
    messages
        .iter()
        .filter_map(|message| message.message_id().map(ToOwned::to_owned))
        .collect()
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
        let visibility_timeout =
            resolve_heartbeat_visibility_timeout(config, options.visibility_timeout)?;
        spawn_heartbeat(
            backend,
            listener.clone(),
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
    stop_heartbeats(heartbeats, listener).await;
    result
}

#[derive(Default)]
struct HeartbeatGuard {
    tasks: Vec<HeartbeatTask>,
    failure_rx: Option<mpsc::UnboundedReceiver<String>>,
}

impl FromIterator<HeartbeatTask> for HeartbeatGuard {
    fn from_iter<T: IntoIterator<Item = HeartbeatTask>>(iter: T) -> Self {
        Self {
            tasks: iter.into_iter().collect(),
            failure_rx: None,
        }
    }
}

impl HeartbeatGuard {
    fn has_failure_channel(&self) -> bool {
        self.failure_rx.is_some()
    }

    async fn recv_failure(&mut self) -> Option<String> {
        match &mut self.failure_rx {
            Some(failure_rx) => failure_rx.recv().await,
            None => None,
        }
    }
}

impl Drop for HeartbeatGuard {
    fn drop(&mut self) {
        for task in &mut self.tasks {
            let _ = task.stop.send(true);
            task.handle.abort();
        }
    }
}

async fn stop_heartbeats(mut handles: HeartbeatGuard, listener: Arc<dyn ConsumerListener>) {
    let handles = std::mem::take(&mut handles.tasks);
    for task in handles {
        let _ = task.stop.send(true);
        if let Err(error) = task.handle.await {
            let error = ConsumerError::Join(error);
            listener.on_error(&error, None);
        }
    }
}

fn map_receive_error(error: BackendError) -> ConsumerError {
    ConsumerError::ReceiveMessage(Box::new(error))
}

fn map_delete_error(error: BackendError, message_ids: &[String]) -> ConsumerError {
    let failed_message_ids = match &error {
        BackendError::DeleteBatchFailed(indexes) => indexes
            .iter()
            .filter_map(|index| message_ids.get(*index).cloned())
            .collect(),
        _ => message_ids.to_vec(),
    };
    ConsumerError::DeleteMessageBatch {
        failed_message_ids,
        source: Box::new(error),
    }
}

fn map_visibility_error(error: BackendError) -> ConsumerError {
    ConsumerError::ChangeMessageVisibility(Box::new(error))
}

pub async fn shutdown_signal() -> Result<(), std::io::Error> {
    #[cfg(unix)]
    {
        let mut sigterm =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())?;
        tokio::select! {
            signal = tokio::signal::ctrl_c() => signal,
            _ = sigterm.recv() => Ok(()),
        }
    }

    #[cfg(not(unix))]
    {
        tokio::signal::ctrl_c().await
    }
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
        fail_visibility: bool,
    }

    #[async_trait]
    impl SqsBackend for MockBackend {
        async fn receive_messages(
            &self,
            _queue_url: &str,
            _max_number_of_messages: i32,
            _wait_time_seconds: i32,
            _visibility_timeout: Option<i32>,
            _attribute_names: &[aws_sdk_sqs::types::MessageSystemAttributeName],
            _message_attribute_names: &[String],
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
            entries: Vec<(String, String)>,
        ) -> Result<(), BackendError> {
            if self.fail_delete {
                return Err(BackendError::DeleteBatchFailed(vec![0]));
            }
            self.deleted.lock().await.push(
                entries
                    .iter()
                    .map(|(_, receipt_handle)| receipt_handle.to_owned())
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
            if self.fail_visibility {
                return Err(BackendError::Test("visibility failed".into()));
            }
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

    struct FailingEarlyAckHandler;

    #[async_trait]
    impl BatchMessageHandler for FailingEarlyAckHandler {
        type Error = TestHandlerError;

        async fn ack_before_batch(
            &self,
            _messages: &[Message],
        ) -> Result<Vec<String>, Self::Error> {
            Err(TestHandlerError)
        }

        async fn handle_batch(&self, _messages: Vec<Message>) -> Result<BatchOutcome, Self::Error> {
            Ok(BatchOutcome::AckAll)
        }
    }

    #[derive(Default)]
    struct RecordingListener {
        aborted_message_ids: Arc<std::sync::Mutex<Vec<Vec<String>>>>,
        graceful_timeout_message_ids: Arc<std::sync::Mutex<Vec<Vec<String>>>>,
        error_message_ids: Arc<std::sync::Mutex<Vec<Vec<String>>>>,
        message_processed_ids: Arc<std::sync::Mutex<Vec<String>>>,
        response_processed_counts: Arc<std::sync::Mutex<Vec<usize>>>,
        polling_started_count: Arc<std::sync::Mutex<usize>>,
        polling_completed_count: Arc<std::sync::Mutex<usize>>,
        waiting_for_polling_count: Arc<std::sync::Mutex<usize>>,
        polling_wait_exceeded_count: Arc<std::sync::Mutex<usize>>,
    }

    impl ConsumerListener for RecordingListener {
        fn on_polling_started(&self) {
            *self.polling_started_count.lock().unwrap() += 1;
        }

        fn on_polling_completed(&self) {
            *self.polling_completed_count.lock().unwrap() += 1;
        }

        fn on_aborted(&self, aborted_message_ids: &[String]) {
            self.aborted_message_ids
                .lock()
                .unwrap()
                .push(aborted_message_ids.to_vec());
        }

        fn on_error(
            &self,
            error: &(dyn std::error::Error + 'static),
            messages: Option<&[Message]>,
        ) {
            if let Some(ConsumerError::GracefulShutdownTimeout { message_ids }) =
                error.downcast_ref::<ConsumerError>()
            {
                self.graceful_timeout_message_ids
                    .lock()
                    .unwrap()
                    .push(message_ids.clone());
            }
            if let Some(messages) = messages {
                self.error_message_ids
                    .lock()
                    .unwrap()
                    .push(message_ids(messages));
            }
        }

        fn on_message_processed(&self, message: &Message) {
            if let Some(message_id) = message.message_id() {
                self.message_processed_ids
                    .lock()
                    .unwrap()
                    .push(message_id.to_owned());
            }
        }

        fn on_response_processed(&self, count: usize) {
            self.response_processed_counts.lock().unwrap().push(count);
        }

        fn on_waiting_for_polling(&self) {
            *self.waiting_for_polling_count.lock().unwrap() += 1;
        }

        fn on_polling_wait_exceeded(&self) {
            *self.polling_wait_exceeded_count.lock().unwrap() += 1;
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

        assert!(
            matches!(error, ConsumerError::DeleteMessageBatch { failed_message_ids, .. } if failed_message_ids == vec!["1"])
        );
    }

    #[tokio::test]
    async fn run_once_notifies_polling_lifecycle_and_processed_count() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let listener = RecordingListener::default();
        let message_processed_ids = listener.message_processed_ids.clone();
        let response_processed_counts = listener.response_processed_counts.clone();
        let polling_started_count = listener.polling_started_count.clone();
        let polling_completed_count = listener.polling_completed_count.clone();
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: None,
        };

        consumer(backend, handler, options())
            .listener(listener)
            .run_once()
            .await
            .unwrap();

        assert_eq!(*polling_started_count.lock().unwrap(), 1);
        assert_eq!(*polling_completed_count.lock().unwrap(), 1);
        assert_eq!(*message_processed_ids.lock().unwrap(), vec!["1"]);
        assert_eq!(*response_processed_counts.lock().unwrap(), vec![1]);
    }

    #[tokio::test(start_paused = true)]
    async fn empty_response_waits_before_next_poll() {
        let backend = Arc::new(MockBackend::default());
        backend.receives.lock().await.push_back(Ok(Vec::new()));
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let listener = RecordingListener::default();
        let waiting_for_polling_count = listener.waiting_for_polling_count.clone();
        let polling_wait_exceeded_count = listener.polling_wait_exceeded_count.clone();
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: None,
        };
        let options = ConsumerOptions::builder()
            .queue_url("queue")
            .wait_time_seconds(0)
            .polling_wait_time(Duration::from_secs(5))
            .build_for_backend()
            .unwrap();
        let consumer = consumer(backend.clone(), handler, options).listener(listener);
        let shutdown = consumer.shutdown_handle();

        let task = tokio::spawn(async move { consumer.run().await });
        tokio::task::yield_now().await;
        tokio::time::advance(Duration::from_secs(5)).await;
        tokio::task::yield_now().await;
        shutdown.graceful();
        task.await.unwrap().unwrap();

        assert_eq!(*backend.deleted.lock().await, vec![vec!["r1"]]);
        assert!(*waiting_for_polling_count.lock().unwrap() >= 1);
        assert!(*polling_wait_exceeded_count.lock().unwrap() >= 1);
    }

    #[tokio::test(start_paused = true)]
    async fn heartbeat_failure_aborts_handler_and_surfaces_error() {
        let backend = Arc::new(MockBackend {
            fail_visibility: true,
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
            delay: Some(Duration::from_secs(60)),
        };
        let options = ConsumerOptions::builder()
            .queue_url("queue")
            .wait_time_seconds(0)
            .visibility_timeout(10)
            .heartbeat(HeartbeatConfig::new(Duration::from_secs(1)))
            .build_for_backend()
            .unwrap();

        let consumer = consumer(backend.clone(), handler, options);
        let task = tokio::spawn(async move { consumer.run_once().await });
        tokio::time::advance(Duration::from_secs(1)).await;
        let error = task.await.unwrap().unwrap_err();

        assert!(
            matches!(error, ConsumerError::HeartbeatFailed { message_id } if message_id == "1")
        );
        assert!(backend.deleted.lock().await.is_empty());
    }

    #[tokio::test]
    async fn ack_before_batch_error_notifies_listener_with_batch_messages() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let listener = RecordingListener::default();
        let error_message_ids = listener.error_message_ids.clone();

        let error = Consumer::with_test_backend(
            options(),
            backend,
            HandlerKind::Batch(Arc::new(FailingEarlyAckHandler)),
        )
        .listener(listener)
        .run_once()
        .await
        .unwrap_err();

        assert!(matches!(error, ConsumerError::Processing(_)));
        assert_eq!(*error_message_ids.lock().unwrap(), vec![vec!["1"]]);
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
            .heartbeat(HeartbeatConfig::new(Duration::from_secs(1)))
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
        let listener = RecordingListener::default();
        let aborted_message_ids = listener.aborted_message_ids.clone();
        let consumer = consumer(backend.clone(), handler, options()).listener(listener);
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
        assert_eq!(*aborted_message_ids.lock().unwrap(), vec![vec!["1"]]);
    }

    #[tokio::test(start_paused = true)]
    async fn graceful_shutdown_timeout_reports_ids_and_finishes_ack_state() {
        let backend = Arc::new(MockBackend::default());
        backend
            .receives
            .lock()
            .await
            .push_back(Ok(vec![message("1", Some("r1"))]));
        let handler = TestHandler {
            batch_outcome: BatchOutcome::AckAll,
            message_outcome: HandleOutcome::Ack,
            delay: Some(Duration::from_secs(5)),
        };
        let options = ConsumerOptions::builder()
            .queue_url("queue")
            .wait_time_seconds(0)
            .polling_complete_wait_time(Duration::from_millis(100))
            .build_for_backend()
            .unwrap();
        let listener = RecordingListener::default();
        let timed_out_message_ids = listener.graceful_timeout_message_ids.clone();
        let consumer = consumer(backend.clone(), handler, options).listener(listener);
        let shutdown = consumer.shutdown_handle();
        let task = tokio::spawn(consumer.run());

        tokio::task::yield_now().await;
        shutdown.graceful();
        tokio::time::advance(Duration::from_millis(100)).await;
        tokio::task::yield_now().await;
        tokio::time::advance(Duration::from_secs(5)).await;
        task.await.unwrap().unwrap();

        assert_eq!(*timed_out_message_ids.lock().unwrap(), vec![vec!["1"]]);
        assert_eq!(*backend.deleted.lock().await, vec![vec!["r1"]]);
    }
}
