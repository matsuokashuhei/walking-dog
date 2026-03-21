use async_graphql::{Context, Object, Result};
use std::sync::Arc;
use crate::AppState;
use crate::graphql::types::user::User;
use crate::services::user_service;

#[derive(Default)]
pub struct UserQuery;

#[Object]
impl UserQuery {
    async fn me(&self, ctx: &Context<'_>) -> Result<User> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        Ok(user_service::get_or_create_user(&state.db, cognito_sub).await?)
    }
}
