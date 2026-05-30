use anyhow::Result;
use async_graphql::{Context, InputObject, MaybeUndefined, Object, Upload};
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue::{NotSet, Set};

use crate::graphql::object::user::User;
use crate::util::storage::upload_avatar;
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
            active_model.avatar = Set(Some(upload_avatar(ctx, file).await?));
        }
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let updated_user = active_model.update(db).await?;
        Ok(User::from(updated_user))
    }
}

#[derive(Debug, InputObject)]
struct UpdateUserInput {
    name: MaybeUndefined<String>,
    avatar: Option<Upload>,
}

impl UpdateUserInput {
    #[allow(clippy::wrong_self_convention)]
    fn into_active_model(&self, id: uuid::Uuid) -> user::ActiveModel {
        user::ActiveModel {
            id: Set(id),
            name: match &self.name {
                MaybeUndefined::Undefined => NotSet,
                MaybeUndefined::Null => Set(None),
                MaybeUndefined::Value(name) => Set(Some(name.clone())),
            },
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_graphql::MaybeUndefined;
    use sea_orm::ActiveValue::{NotSet, Set};
    use uuid::Uuid;

    #[test]
    fn update_user_input_leaves_name_unset_when_omitted() {
        let input = UpdateUserInput {
            name: MaybeUndefined::Undefined,
            avatar: None,
        };

        let active_model = input.into_active_model(Uuid::now_v7());

        assert!(matches!(active_model.name, NotSet));
    }

    #[test]
    fn update_user_input_sets_name_when_present() {
        let input = UpdateUserInput {
            name: MaybeUndefined::Value("Mio Tanaka".to_string()),
            avatar: None,
        };

        let active_model = input.into_active_model(Uuid::now_v7());

        assert!(matches!(active_model.name, Set(Some(name)) if name == "Mio Tanaka"));
    }
}
