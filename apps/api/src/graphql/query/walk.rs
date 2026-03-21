use async_graphql::{Object, Result, ID, Context};
use std::sync::Arc;
use crate::AppState;
use crate::graphql::types::walk::Walk;
use crate::services::{user_service, walk_service};

#[derive(Default)]
pub struct WalkQuery;

#[Object]
impl WalkQuery {
    async fn walk(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Walk>> {
        let state = ctx.data::<Arc<AppState>>()?;
        let walk_id = uuid::Uuid::parse_str(&id)
            .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;
        Ok(walk_service::get_walk_by_id(&state.db, walk_id).await?)
    }

    async fn my_walks(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<Walk>> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        let user = user_service::get_or_create_user(&state.db, cognito_sub).await?;
        Ok(walk_service::get_my_walks(
            &state.db,
            user.id,
            limit.unwrap_or(20) as u64,
            offset.unwrap_or(0) as u64,
        ).await?)
    }
}
