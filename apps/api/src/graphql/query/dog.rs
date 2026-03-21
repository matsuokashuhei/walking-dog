use async_graphql::{Object, Result, ID, Context};
use crate::graphql::types::dog::Dog;

#[derive(Default)]
pub struct DogQuery;

#[Object]
impl DogQuery {
    async fn dog(&self, _ctx: &Context<'_>, _id: ID) -> Result<Option<Dog>> {
        Ok(None)
    }
}
