use tokio::sync::watch;

#[derive(Clone, Debug)]
pub struct Shutdown {
    sender: watch::Sender<bool>,
}

#[derive(Debug)]
pub struct ShutdownSignal {
    receiver: watch::Receiver<bool>,
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
