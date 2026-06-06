use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq)]
pub struct Model {
    pub walk_id: Uuid,
    pub tracked_at: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
}

impl Model {
    pub fn new(walk_id: Uuid, tracked_at: DateTime<Utc>, latitude: f64, longitude: f64) -> Self {
        Self {
            walk_id,
            tracked_at,
            latitude,
            longitude,
        }
    }
}
