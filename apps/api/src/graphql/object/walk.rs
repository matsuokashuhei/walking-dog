use anyhow::anyhow;
use async_graphql::{ComplexObject, Context, SimpleObject};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use uuid::Uuid;

use crate::entity::{dog, walk, walk_dog, walk_photo};
use crate::graphql::object::dog::Dog;
use crate::graphql::object::walk_photo::WalkPhoto;

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
    async fn dogs(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Dog>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let dogs = dog::Entity::find()
            .has_related(walk_dog::Entity, walk_dog::Column::WalkId.eq(self.id))
            .order_by(dog::Column::Name, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| anyhow!(e))?;
        Ok(dogs.into_iter().map(Dog::from).collect())
    }

    async fn photos(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<WalkPhoto>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let photos = walk_photo::Entity::find()
            .filter(walk_photo::Column::WalkId.eq(self.id))
            .order_by(walk_photo::Column::OccurredAt, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| anyhow!(e))?;
        Ok(photos.into_iter().map(WalkPhoto::from).collect())
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
