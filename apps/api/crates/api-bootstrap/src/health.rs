use std::sync::Arc;

use serde::Serialize;
use tokio::sync::RwLock;

#[derive(Clone, Debug, Serialize)]
pub struct HealthSnapshot {
    pub live: bool,
    pub ready: bool,
}

#[derive(Clone, Debug)]
pub struct Health(Arc<RwLock<bool>>);

impl Health {
    #[must_use]
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(false)))
    }

    pub async fn mark_ready(&self) {
        *self.0.write().await = true;
    }

    pub async fn is_ready(&self) -> bool {
        *self.0.read().await
    }

    pub async fn snapshot(&self) -> serde_json::Value {
        let snapshot = HealthSnapshot {
            live: true,
            ready: self.is_ready().await,
        };
        serde_json::json!(snapshot)
    }
}

impl Default for Health {
    fn default() -> Self {
        Self::new()
    }
}
