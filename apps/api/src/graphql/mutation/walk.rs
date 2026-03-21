use async_graphql::{Context, InputObject, Object, Result, ID};
use crate::graphql::types::walk::Walk;

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
    async fn start_walk(&self, _ctx: &Context<'_>, _dog_ids: Vec<ID>) -> Result<Walk> {
        Err(async_graphql::Error::new("Not implemented"))
    }

    async fn add_walk_points(
        &self,
        _ctx: &Context<'_>,
        _walk_id: ID,
        _points: Vec<WalkPointInput>,
    ) -> Result<bool> {
        Err(async_graphql::Error::new("Not implemented"))
    }

    async fn finish_walk(&self, _ctx: &Context<'_>, _walk_id: ID) -> Result<Walk> {
        Err(async_graphql::Error::new("Not implemented"))
    }
}
