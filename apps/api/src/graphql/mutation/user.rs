use anyhow::Result;
use async_graphql::{Context, InputObject, Object, Upload};
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue::Set;

use crate::graphql::object::user::User;
use crate::storage::upload_avatar;
use crate::{entity::user, graphql::guard::AuthGuard};

#[derive(Default, Debug)]
pub struct UserMutation;

#[Object]
impl UserMutation {
    #[graphql(guard = "AuthGuard")]
    async fn update_user(&self, ctx: &Context<'_>, input: UpdateUserInput) -> Result<User> {
        let user = ctx.data::<user::Model>().unwrap();
        let mut active_model = input.into_active_model(user.id);
        if let Some(file) = input.avatar {
            if let Ok(file) = upload_avatar(ctx, file).await {
                active_model.avatar = Set(Some(file));
            }
        }
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let updated_user = active_model.update(db).await?;
        Ok(User::from(updated_user))
    }
}

#[derive(Debug, InputObject)]
struct UpdateUserInput {
    name: Option<String>,
    avatar: Option<Upload>,
}

impl UpdateUserInput {
    fn into_active_model(&self, id: uuid::Uuid) -> user::ActiveModel {
        user::ActiveModel {
            id: Set(id),
            name: Set(self.name.clone()),
            ..Default::default()
        }
    }
}
