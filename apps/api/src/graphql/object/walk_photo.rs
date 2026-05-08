use async_graphql::SimpleObject;
use uuid::Uuid;

use crate::{entity::walk_photo, graphql::object::coordinate::Coordinate};

#[derive(SimpleObject, Clone, Debug)]
pub struct WalkPhoto {
    pub id: Uuid,
    pub walk_id: Uuid,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
    pub file: String,
    pub coordinate: Coordinate,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<walk_photo::Model> for WalkPhoto {
    fn from(model: walk_photo::Model) -> Self {
        WalkPhoto {
            id: model.id,
            walk_id: model.walk_id,
            occurred_at: model.occurred_at.into(),
            file: model.file,
            coordinate: Coordinate {
                latitude: model.latitude.into(),
                longitude: model.longitude.into(),
            },
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
