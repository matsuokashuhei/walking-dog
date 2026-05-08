use anyhow::Result;
use async_graphql::{ComplexObject, Context, SimpleObject};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use uuid::Uuid;

use crate::entity::{dog, track_point, walk, walk_dog, walk_photo};
use crate::graphql::{
    error::AppError,
    object::{dog::Dog, track_point::TrackPoint, walk_dog::WalkDog, walk_photo::WalkPhoto},
};

#[derive(SimpleObject, Clone, Debug)]
#[graphql(complex)]
pub struct Walk {
    pub id: Uuid,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub ended_at: Option<chrono::DateTime<chrono::Utc>>,
    pub distance: Option<i64>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[ComplexObject]
impl Walk {
    async fn walk_dogs(&self, ctx: &Context<'_>) -> Result<Vec<WalkDog>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let walk_dogs = walk_dog::Entity::find()
            .filter(walk_dog::Column::WalkId.eq(self.id))
            .order_by(walk_dog::Column::CreatedAt, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(walk_dogs.into_iter().map(WalkDog::from).collect())
    }

    async fn dogs(&self, ctx: &Context<'_>) -> Result<Vec<Dog>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let dogs = dog::Entity::find()
            .has_related(walk_dog::Entity, walk_dog::Column::WalkId.eq(self.id))
            .order_by(dog::Column::Name, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(dogs.into_iter().map(Dog::from).collect())
    }

    async fn photos(&self, ctx: &Context<'_>) -> Result<Vec<WalkPhoto>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let photos = walk_photo::Entity::find()
            .filter(walk_photo::Column::WalkId.eq(self.id))
            .order_by(walk_photo::Column::OccurredAt, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(photos.into_iter().map(WalkPhoto::from).collect())
    }

    async fn track_points(&self, ctx: &Context<'_>) -> Result<Vec<TrackPoint>> {
        let client = ctx.data::<aws_sdk_dynamodb::Client>().unwrap();
        let track_points = track_point::Model::find_all_by_walk_id(client, self.id)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(track_points.into_iter().map(TrackPoint::from).collect())
    }
}

impl From<walk::Model> for Walk {
    fn from(model: walk::Model) -> Self {
        Walk {
            id: model.id,
            started_at: model.started_at.into(),
            ended_at: model.ended_at.map(Into::into),
            distance: model.distance,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
