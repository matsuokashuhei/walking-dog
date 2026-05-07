use async_graphql::SimpleObject;
use uuid::Uuid;

use crate::entity::track_point;

#[derive(SimpleObject, Clone, Debug)]
pub struct TrackPoint {
    pub walk_id: Uuid,
    pub latitude: f64,
    pub longitude: f64,
    pub tracked_at: chrono::DateTime<chrono::Utc>,
}

impl From<track_point::Model> for TrackPoint {
    fn from(model: track_point::Model) -> Self {
        TrackPoint {
            walk_id: model.walk_id,
            latitude: model.latitude,
            longitude: model.longitude,
            tracked_at: model.tracked_at,
        }
    }
}
