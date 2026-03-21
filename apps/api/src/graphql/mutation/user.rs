use async_graphql::{Context, InputObject, Object, Result};
use std::sync::Arc;
use crate::AppState;
use crate::graphql::types::user::User;
use crate::services::user_service;

#[derive(InputObject)]
pub struct UpdateProfileInput {
    pub display_name: Option<String>,
}

#[derive(Default)]
pub struct UserMutation;

#[Object]
impl UserMutation {
    async fn update_profile(
        &self,
        ctx: &Context<'_>,
        input: UpdateProfileInput,
    ) -> Result<User> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        Ok(user_service::update_profile(&state.db, cognito_sub, input.display_name).await?)
    }
}
