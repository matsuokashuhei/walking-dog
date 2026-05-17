use async_graphql::{Context, ErrorExtensions, Guard, Result};

use crate::entity::user;
use crate::graphql::error::AppError::Unauthorized;

pub struct AuthGuard;

impl Guard for AuthGuard {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        match ctx.data::<user::Model>() {
            Ok(_) => Ok(()),
            Err(_) => Err(Unauthorized.extend()),
        }
    }
}
