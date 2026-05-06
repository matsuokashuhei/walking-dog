use anyhow::Result;
use async_graphql::{Context, Object};

use crate::graphql::guard::AuthGuard;
use crate::{entity::user, graphql::object::user::User};

#[derive(Default, Debug)]
pub struct UserQuery;

#[Object]
impl UserQuery {
    #[graphql(guard = "AuthGuard")]
    async fn user(&self, ctx: &Context<'_>) -> Result<User> {
        let user = ctx.data::<user::Model>().unwrap();
        Ok(User::from(user.clone()))
    }
}
