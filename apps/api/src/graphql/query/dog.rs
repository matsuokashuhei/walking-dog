use async_graphql::{Context, Object, Result};
use sea_orm::{ColumnTrait, EntityTrait, QueryOrder};

use crate::{entity::user, graphql::object::dog::Dog};
use crate::{
    entity::{dog, user_dog},
    graphql::{error::AppError, guard::AuthGuard},
};
#[derive(Default, Debug)]
pub struct DogQuery;

#[Object]
impl DogQuery {
    #[graphql(guard = "AuthGuard")]
    async fn dogs(&self, ctx: &Context<'_>) -> Result<Vec<Dog>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();

        let dogs = dog::Entity::find()
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .order_by(dog::Column::Name, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(dogs.into_iter().map(Dog::from).collect())
    }
}
