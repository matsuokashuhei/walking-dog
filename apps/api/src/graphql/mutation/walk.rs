use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use uuid::Uuid;

use crate::entity::user;
use crate::graphql::{error::AppError, guard::AuthGuard, object::walk::Walk};
use crate::service::{track_point::SharedTrackPointRepository, walk as walk_service};

#[derive(Default, Debug)]
pub struct WalkMutation;

#[Object]
impl WalkMutation {
    #[graphql(guard = "AuthGuard")]
    async fn start_walk(&self, ctx: &Context<'_>, input: StartWalkInput) -> Result<Walk> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let walk = walk_service::start_walk(db, user.id, &input.dog_ids)
            .await
            .map_err(AppError::from)?;
        Ok(Walk::from(walk))
    }

    #[graphql(guard = "AuthGuard")]
    async fn end_walk(&self, ctx: &Context<'_>, input: EndWalkInput) -> Result<Walk> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let repository = ctx.data::<SharedTrackPointRepository>().unwrap();
        let updated_walk = walk_service::finish_walk(
            db,
            repository.as_ref(),
            user.id,
            input.id,
            chrono::Utc::now(),
        )
        .await
        .map_err(AppError::from)?;
        Ok(Walk::from(updated_walk))
    }
}

#[derive(Clone, Debug, InputObject)]
struct StartWalkInput {
    dog_ids: Vec<Uuid>,
}

#[derive(Clone, Debug, InputObject)]
struct EndWalkInput {
    id: Uuid,
}
