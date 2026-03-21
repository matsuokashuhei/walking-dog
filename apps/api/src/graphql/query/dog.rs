use async_graphql::{Object, Result, ID, Context};
use std::sync::Arc;
use crate::AppState;
use crate::graphql::types::dog::Dog;
use crate::services::dog_service;

#[derive(Default)]
pub struct DogQuery;

#[Object]
impl DogQuery {
    async fn dog(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Dog>> {
        let state = ctx.data::<Arc<AppState>>()?;
        let dog_id = uuid::Uuid::parse_str(&id)
            .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
        Ok(dog_service::get_dog_by_id(&state.db, dog_id).await?)
    }
}
