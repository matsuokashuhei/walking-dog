use crate::error::AppError;
use crate::graphql::auth_helpers;
use crate::services::{dog_invitation_service, dog_member_service, dog_service};
use crate::AppState;
use async_graphql::dynamic::{Field, FieldFuture, FieldValue, InputValue, Object, TypeRef};
use std::sync::Arc;
use uuid::Uuid;

/// Returned by `generateDogInvitation`.
#[derive(Clone, Debug)]
pub struct DogInvitationOutput {
    pub id: Uuid,
    pub dog_id: Uuid,
    pub token: String,
    pub expires_at: String,
}

impl From<crate::entities::dog_invitations::Model> for DogInvitationOutput {
    fn from(m: crate::entities::dog_invitations::Model) -> Self {
        let expires: chrono::DateTime<chrono::Utc> = m.expires_at.into();
        Self {
            id: m.id,
            dog_id: m.dog_id,
            token: m.token,
            expires_at: expires.to_rfc3339(),
        }
    }
}

/// Dog member with user info, used in DogOutput.members.
#[derive(Clone, Debug)]
pub struct DogMemberOutput {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: String,
}

impl
    From<(
        crate::entities::dog_members::Model,
        crate::entities::users::Model,
    )> for DogMemberOutput
{
    fn from(
        (member, user): (
            crate::entities::dog_members::Model,
            crate::entities::users::Model,
        ),
    ) -> Self {
        let created: chrono::DateTime<chrono::Utc> = member.created_at.into();
        Self {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            created_at: created.to_rfc3339(),
        }
    }
}

pub fn dog_invitation_output_type() -> Object {
    Object::new("DogInvitationOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "dogId",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.dog_id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "token",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.token.clone())))
                })
            },
        ))
        .field(Field::new(
            "expiresAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.expires_at.clone())))
                })
            },
        ))
}

pub fn dog_member_output_type() -> Object {
    Object::new("DogMemberOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "userId",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.user_id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "role",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.role.clone())))
                })
            },
        ))
        .field(Field::new("user", TypeRef::named("WalkerOutput"), |ctx| {
            FieldFuture::new(async move {
                let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                Ok(Some(FieldValue::owned_any(super::walk::WalkerOutput {
                    id: m.user_id,
                    display_name: m.display_name.clone(),
                    avatar_url: m.avatar_url.clone(),
                })))
            })
        }))
        .field(Field::new(
            "createdAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.created_at.clone())))
                })
            },
        ))
}

pub fn generate_dog_invitation_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateDogInvitation",
        TypeRef::named_nn("DogInvitationOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;
                dog_member_service::require_dog_owner(&state.db, dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                let invitation =
                    dog_invitation_service::create_invitation(&state.db, dog_id, user.id)
                        .await
                        .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::owned_any(DogInvitationOutput::from(
                    invitation,
                ))))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
}

pub fn accept_dog_invitation_field(state: Arc<AppState>) -> Field {
    Field::new(
        "acceptDogInvitation",
        TypeRef::named_nn("DogOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let token = ctx.args.try_get("token")?.string()?.to_string();

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                let member = dog_invitation_service::accept_invitation(&state.db, &token, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                let dog = dog_service::get_dog_by_id(&state.db, member.dog_id)
                    .await
                    .map_err(AppError::into_graphql_error)?
                    .ok_or_else(|| async_graphql::Error::new("Dog not found"))?;

                Ok(Some(FieldValue::owned_any(super::dog::DogOutput::from(
                    dog,
                ))))
            })
        },
    )
    .argument(InputValue::new("token", TypeRef::named_nn(TypeRef::STRING)))
}

pub fn remove_dog_member_field(state: Arc<AppState>) -> Field {
    Field::new(
        "removeDogMember",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
                let target_user_id_str = ctx.args.try_get("userId")?.string()?;
                let target_user_id = Uuid::parse_str(target_user_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid user ID"))?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                // Only the owner can remove members
                dog_member_service::require_dog_owner(&state.db, dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                // Cannot remove yourself (owner) via this mutation
                if target_user_id == user.id {
                    return Err(async_graphql::Error::new(
                        "Cannot remove yourself. Use leaveDog instead.",
                    ));
                }

                let result = dog_member_service::remove_member(&state.db, dog_id, target_user_id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("userId", TypeRef::named_nn(TypeRef::ID)))
}

pub fn leave_dog_field(state: Arc<AppState>) -> Field {
    Field::new(
        "leaveDog",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

                let (user, membership) =
                    auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

                // Owners cannot leave their own dog
                if membership.role == "owner" {
                    return Err(async_graphql::Error::new(
                        "Owners cannot leave their dog. Transfer ownership or delete the dog.",
                    ));
                }

                let result = dog_member_service::remove_member(&state.db, dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
}
