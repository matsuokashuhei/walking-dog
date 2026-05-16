use std::{sync::Arc, time::Duration};

use aws_sdk_sqs::types::Message;
use tokio::{
    sync::{mpsc, watch},
    task::JoinHandle,
};

use crate::{backend::SqsBackend, listener::ConsumerListener};

pub(crate) struct HeartbeatSpawn {
    pub(crate) backend: Arc<dyn SqsBackend>,
    pub(crate) listener: Arc<dyn ConsumerListener>,
    pub(crate) queue_url: String,
    pub(crate) message: Message,
    pub(crate) receipt_handle: String,
    pub(crate) message_id: String,
    pub(crate) interval: Duration,
    pub(crate) visibility_timeout: i32,
    pub(crate) stop_tx: watch::Sender<bool>,
    pub(crate) stop_rx: watch::Receiver<bool>,
    pub(crate) failure_tx: mpsc::UnboundedSender<String>,
}

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
    spawn_heartbeat_with_failure_channel(HeartbeatSpawn {
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
    })
}

pub(crate) struct HeartbeatTask {
    pub(crate) stop: watch::Sender<bool>,
    pub(crate) handle: JoinHandle<()>,
}

pub(crate) fn spawn_heartbeat_with_failure_channel(spawn: HeartbeatSpawn) -> Option<HeartbeatTask> {
    let HeartbeatSpawn {
        backend,
        listener,
        queue_url,
        message,
        receipt_handle,
        message_id,
        interval,
        visibility_timeout,
        stop_tx,
        mut stop_rx,
        failure_tx,
    } = spawn;
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
