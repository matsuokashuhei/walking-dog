use std::future::Future;
use thiserror::Error;
use tokio::sync::watch;

#[derive(Clone, Debug)]
pub struct Shutdown {
    sender: watch::Sender<bool>,
}

#[derive(Debug)]
pub struct ShutdownSignal {
    receiver: watch::Receiver<bool>,
}

#[derive(Debug, Error)]
pub enum LifecycleError<E> {
    #[error("termination signal failed: {0}")]
    Signal(#[source] std::io::Error),
    #[error("service lifecycle failed: {0}")]
    Service(E),
}

impl Shutdown {
    #[must_use]
    pub fn new() -> Self {
        let (sender, _) = watch::channel(false);
        Self { sender }
    }
    #[must_use]
    pub fn subscribe(&self) -> ShutdownSignal {
        ShutdownSignal {
            receiver: self.sender.subscribe(),
        }
    }
    pub fn trigger(&self) {
        self.sender.send_replace(true);
    }
}

impl Default for Shutdown {
    fn default() -> Self {
        Self::new()
    }
}

impl ShutdownSignal {
    pub async fn wait(mut self) {
        if *self.receiver.borrow() {
            return;
        }
        while self.receiver.changed().await.is_ok() {
            if *self.receiver.borrow() {
                return;
            }
        }
    }
}

/// Coordinates a service future with an injectable termination waiter.
///
/// # Errors
///
/// Returns the signal installation/wait error or the service lifecycle error.
pub async fn coordinate_shutdown<O, S, E>(
    shutdown: Shutdown,
    operation: O,
    signal: S,
) -> Result<(), LifecycleError<E>>
where
    O: Future<Output = Result<(), E>>,
    S: Future<Output = std::io::Result<()>>,
{
    tokio::pin!(operation);
    tokio::pin!(signal);
    tokio::select! {
        result = &mut operation => result.map_err(LifecycleError::Service),
        result = &mut signal => {
            result.map_err(LifecycleError::Signal)?;
            shutdown.trigger();
            operation.await.map_err(LifecycleError::Service)
        }
    }
}

/// Waits for the platform termination signal used by interactive shells and
/// container runtimes.
///
/// # Errors
///
/// Returns an error when the operating system signal handler cannot be installed.
#[cfg(unix)]
pub async fn wait_for_termination() -> std::io::Result<()> {
    use tokio::signal::unix::{SignalKind, signal};

    let mut terminate = signal(SignalKind::terminate())?;
    tokio::select! {
        result = tokio::signal::ctrl_c() => result,
        _ = terminate.recv() => Ok(()),
    }
}

#[cfg(not(unix))]
pub async fn wait_for_termination() -> std::io::Result<()> {
    tokio::signal::ctrl_c().await
}
