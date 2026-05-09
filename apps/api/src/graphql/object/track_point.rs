use async_graphql::SimpleObject;
use uuid::Uuid;

use crate::{entity::track_point, graphql::object::coordinate::Coordinate};

#[derive(SimpleObject, Clone, Debug)]
pub struct TrackPoint {
    pub walk_id: Uuid,
    pub tracked_at: chrono::DateTime<chrono::Utc>,
    pub coordinate: Coordinate,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct TrackPointReceipt {
    pub walk_id: Uuid,
    pub tracked_at: chrono::DateTime<chrono::Utc>,
    pub accepted_at: chrono::DateTime<chrono::Utc>,
}

impl From<track_point::Model> for TrackPoint {
    fn from(model: track_point::Model) -> Self {
        TrackPoint {
            walk_id: model.walk_id,
            tracked_at: model.tracked_at,
            coordinate: Coordinate {
                latitude: model.latitude.into(),
                longitude: model.longitude.into(),
            },
        }
    }
}
