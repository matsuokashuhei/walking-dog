use async_graphql::{Context, InputObject, Object, Result, ID};
use std::sync::Arc;
use crate::AppState;
use crate::graphql::types::walk::Walk;
use crate::services::{user_service, walk_service, walk_points_service};

#[derive(InputObject)]
pub struct WalkPointInput {
    pub lat: f64,
    pub lng: f64,
    pub recorded_at: String,
}

#[derive(Default)]
pub struct WalkMutation;

#[Object]
impl WalkMutation {
    async fn start_walk(&self, ctx: &Context<'_>, dog_ids: Vec<ID>) -> Result<Walk> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        let user = user_service::get_or_create_user(&state.db, cognito_sub).await?;
        let dog_uuids: Result<Vec<uuid::Uuid>, _> = dog_ids
            .iter()
            .map(|id| uuid::Uuid::parse_str(id).map_err(|_| async_graphql::Error::new("Invalid dog ID")))
            .collect();
        let dog_uuids = dog_uuids?;
        Ok(walk_service::start_walk(&state.db, user.id, dog_uuids)
            .await
            .map_err(|e| e.into_graphql_error())?)
    }

    async fn add_walk_points(
        &self,
        ctx: &Context<'_>,
        walk_id: ID,
        points: Vec<WalkPointInput>,
    ) -> Result<bool> {
        let state = ctx.data::<Arc<AppState>>()?;
        let walk_uuid = uuid::Uuid::parse_str(&walk_id)
            .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;
        let service_points: Vec<walk_points_service::WalkPointInput> = points
            .into_iter()
            .map(|p| walk_points_service::WalkPointInput {
                lat: p.lat,
                lng: p.lng,
                recorded_at: p.recorded_at,
            })
            .collect();
        Ok(walk_points_service::add_walk_points(
            &state.dynamo,
            &state.config.dynamodb_table_walk_points,
            walk_uuid,
            service_points,
        )
        .await
        .map_err(|e| e.into_graphql_error())?)
    }

    async fn finish_walk(&self, ctx: &Context<'_>, walk_id: ID) -> Result<Walk> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        let user = user_service::get_or_create_user(&state.db, cognito_sub).await?;
        let walk_uuid = uuid::Uuid::parse_str(&walk_id)
            .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;
        Ok(walk_service::finish_walk(&state.db, walk_uuid, user.id)
            .await
            .map_err(|e| e.into_graphql_error())?)
    }
}
