use tokio::sync::watch;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum ShutdownState {
    Running,
    Graceful,
    Abort,
}

#[derive(Clone)]
pub struct ShutdownHandle {
    sender: watch::Sender<ShutdownState>,
}

impl ShutdownHandle {
    pub(crate) fn new() -> (Self, watch::Receiver<ShutdownState>) {
        let (sender, receiver) = watch::channel(ShutdownState::Running);
        (Self { sender }, receiver)
    }

    pub fn graceful(&self) {
        let _ = self.sender.send(ShutdownState::Graceful);
    }

    pub fn abort(&self) {
        let _ = self.sender.send(ShutdownState::Abort);
    }
}
