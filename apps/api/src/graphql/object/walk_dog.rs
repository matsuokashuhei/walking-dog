use anyhow::Result;
use async_graphql::{ComplexObject, Context, SimpleObject};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};

use crate::{
    entity::{dog, walk_dog, walk_dog_event},
    graphql::{
        error::AppError,
        object::{dog::Dog, walk_dog_event::WalkDogEvent},
    },
};

#[derive(SimpleObject, Clone, Debug)]
#[graphql(complex)]
pub struct WalkDog {
    pub id: uuid::Uuid,
    pub walk_id: uuid::Uuid,
    pub dog_id: uuid::Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<walk_dog::Model> for WalkDog {
    fn from(model: walk_dog::Model) -> Self {
        WalkDog {
            id: model.id,
            walk_id: model.walk_id,
            dog_id: model.dog_id,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}

#[ComplexObject]
impl WalkDog {
    async fn dog(&self, ctx: &Context<'_>) -> Result<Dog> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let dog = dog::Entity::find_by_id(self.dog_id)
            .one(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?
            .ok_or_else(|| AppError::NotFound)?;
        Ok(Dog::from(dog))
    }
    async fn events(&self, ctx: &Context<'_>) -> Result<Vec<WalkDogEvent>> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let events = walk_dog_event::Entity::find()
            .filter(walk_dog_event::Column::WalkDogId.eq(self.id))
            .order_by(walk_dog_event::Column::OccurredAt, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(events.into_iter().map(WalkDogEvent::from).collect())
    }
}
