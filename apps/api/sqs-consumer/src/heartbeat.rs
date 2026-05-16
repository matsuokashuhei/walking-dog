use std::{sync::Arc, time::Duration};

use aws_sdk_sqs::types::Message;
use tokio::{
    sync::{mpsc, watch},
    task::JoinHandle,
};

use crate::{backend::SqsBackend, listener::ConsumerListener};

pub(crate) fn spawn_heartbeat(
    backend: Arc<dyn SqsBackend>,
    listener: Arc<dyn ConsumerListener>,
    queue_url: String,
    message: Message,
    interval: Duration,
    visibility_timeout: i32,
) -> Option<HeartbeatTask> {
    let receipt_handle = message.receipt_handle()?.to_owned();
    let message_id = message.message_id().unwrap_or(&receipt_handle).to_owned();
    let (stop_tx, stop_rx) = watch::channel(false);
    let (failure_tx, _failure_rx) = mpsc::unbounded_channel::<String>();
    spawn_heartbeat_with_failure_channel(
        backend,
        listener,
        queue_url,
        message,
        receipt_handle,
        message_id,
        interval,
        visibility_timeout,
        stop_tx,
        stop_rx,
        failure_tx,
    )
}

pub(crate) struct HeartbeatTask {
    pub(crate) stop: watch::Sender<bool>,
    pub(crate) handle: JoinHandle<()>,
}

pub(crate) fn spawn_heartbeat_with_failure_channel(
    backend: Arc<dyn SqsBackend>,
    listener: Arc<dyn ConsumerListener>,
    queue_url: String,
    message: Message,
    receipt_handle: String,
    message_id: String,
    interval: Duration,
    visibility_timeout: i32,
    stop_tx: watch::Sender<bool>,
    mut stop_rx: watch::Receiver<bool>,
    failure_tx: mpsc::UnboundedSender<String>,
) -> Option<HeartbeatTask> {
    let handle = tokio::spawn(async move {
        loop {
            tokio::select! {
                changed = stop_rx.changed() => {
                    if changed.is_err() || *stop_rx.borrow() {
                        break;
                    }
                }
                _ = tokio::time::sleep(interval) => {
                    if let Err(error) = backend
                        .change_message_visibility(&queue_url, &receipt_handle, visibility_timeout)
                        .await
                    {
                        listener.on_visibility_error(&message, &error);
                        let _ = failure_tx.send(message_id);
                        break;
                    }
                }
            }
        }
    });
    Some(HeartbeatTask {
        stop: stop_tx,
        handle,
    })
}
