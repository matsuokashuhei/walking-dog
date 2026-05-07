use async_graphql::SimpleObject;
use uuid::Uuid;

use crate::entity::walk_photo;

#[derive(SimpleObject, Clone, Debug)]
pub struct WalkPhoto {
    pub id: Uuid,
    pub walk_id: Uuid,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
    pub file: String,
    pub latitude: f64,
    pub longitude: f64,
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
            latitude: model.latitude,
            longitude: model.longitude,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
