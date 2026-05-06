use anyhow::anyhow;
use async_graphql::{ComplexObject, Context, SimpleObject};
use sea_orm::{ColumnTrait, EntityTrait, QueryOrder};
use uuid::Uuid;

use crate::entity::{dog, user, user_dog};
use crate::graphql::object::dog::Dog;

#[derive(SimpleObject, Clone, Debug)]
#[graphql(complex)]
pub struct User {
    pub id: Uuid,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[ComplexObject]
impl User {
    async fn dogs(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Dog>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let dogs = dog::Entity::find()
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(self.id))
            .order_by(dog::Column::Name, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| anyhow!(e))?;
        Ok(dogs.into_iter().map(Dog::from).collect())
    }
}

impl From<user::Model> for User {
    fn from(model: user::Model) -> Self {
        User {
            id: model.id,
            name: model.name,
            avatar: model.avatar,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
