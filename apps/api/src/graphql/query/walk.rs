use anyhow::Result;
use async_graphql::{Context, Object};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use uuid::Uuid;

use crate::entity::{user, walk};
use crate::graphql::guard::AuthGuard;
use crate::graphql::object::walk::Walk;

#[derive(Default, Debug)]
pub struct WalkQuery;

#[Object]
impl WalkQuery {
    #[graphql(guard = "AuthGuard")]
    async fn walks(&self, ctx: &Context<'_>) -> Result<Vec<Walk>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let walks = walk::Entity::find()
            .filter(walk::Column::UserId.eq(user.id))
            .order_by_id_desc()
            .all(db)
            .await?;
        Ok(walks.into_iter().map(Walk::from).collect())
    }

    #[graphql(guard = "AuthGuard")]
    async fn walk(&self, ctx: &Context<'_>, id: Uuid) -> Result<Walk> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let walk = walk::Entity::find_by_id(id)
            .filter(walk::Column::UserId.eq(user.id))
            .one(db)
            .await?;
        Ok(Walk::from(walk.unwrap()))
    }
}
