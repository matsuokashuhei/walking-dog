use async_graphql::{Object, Result, ID, Context};
use crate::graphql::types::walk::Walk;

#[derive(Default)]
pub struct WalkQuery;

#[Object]
impl WalkQuery {
    async fn walk(&self, _ctx: &Context<'_>, _id: ID) -> Result<Option<Walk>> {
        Ok(None)
    }

    async fn my_walks(
        &self,
        _ctx: &Context<'_>,
        _limit: Option<i32>,
        _offset: Option<i32>,
    ) -> Result<Vec<Walk>> {
        Ok(vec![])
    }
}
