use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue::Set;
use tracing::info;

use crate::graphql::object::user::User;
use crate::{entity::user, graphql::guard::AuthGuard};

#[derive(Default, Debug)]
pub struct UserMutation;

#[Object]
impl UserMutation {
    #[graphql(guard = "AuthGuard")]
    async fn update_user(&self, ctx: &Context<'_>, input: UpdateUserInput) -> Result<User> {
        info!("Entering update_user mutation");
        let user = ctx.data::<user::Model>().unwrap();
        let active_model = input.into_active_model(user.id);
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let updated_user = active_model.update(db).await?;
        Ok(User::from(updated_user))
    }
}

#[derive(Debug, InputObject)]
struct UpdateUserInput {
    name: Option<String>,
    avatar: Option<String>,
}

impl UpdateUserInput {
    fn into_active_model(&self, id: uuid::Uuid) -> user::ActiveModel {
        user::ActiveModel {
            id: Set(id),
            name: Set(self.name.clone()),
            avatar: Set(self.avatar.clone()),
            ..Default::default()
        }
    }
}
