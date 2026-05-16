use std::{sync::Arc, time::Duration};

use aws_sdk_sqs::types::Message;
use tokio::{sync::watch, task::JoinHandle};

use crate::{backend::SqsBackend, listener::ConsumerListener};

pub(crate) fn spawn_heartbeat(
    backend: Arc<dyn SqsBackend>,
    listener: Arc<dyn ConsumerListener>,
    queue_url: String,
    message: Message,
    interval: Duration,
    visibility_timeout: i32,
) -> Option<(watch::Sender<bool>, JoinHandle<()>)> {
    let receipt_handle = message.receipt_handle()?.to_owned();
    let (stop_tx, mut stop_rx) = watch::channel(false);
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
                    }
                }
            }
        }
    });
    Some((stop_tx, handle))
}
