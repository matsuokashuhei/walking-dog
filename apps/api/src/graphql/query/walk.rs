use async_graphql::{Context, Object, Result};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use uuid::Uuid;

use crate::graphql::{error::AppError, guard::AuthGuard};
use crate::{
    entity::{user, walk},
    graphql::object::walk::Walk,
};

#[derive(Default, Debug)]
pub struct WalkQuery;

#[Object]
impl WalkQuery {
    #[graphql(guard = "AuthGuard")]
    async fn walk(&self, ctx: &Context<'_>, id: Uuid) -> Result<Walk> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let walk = walk::Entity::find_by_id(id)
            .filter(walk::Column::UserId.eq(user.id))
            .one(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?
            .ok_or(AppError::NotFound)?;
        Ok(Walk::from(walk))
    }
}
