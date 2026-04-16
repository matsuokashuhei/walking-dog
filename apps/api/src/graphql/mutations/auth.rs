use crate::auth;
use crate::error::AppError;
use crate::graphql::auth_helpers;
use crate::services::user_service;
use crate::AppState;
use async_graphql::dynamic::{
    Field, FieldFuture, FieldValue, InputObject, InputValue, Object, TypeRef,
};
use std::sync::Arc;
use uuid::Uuid;

/// Returned by `me` query and `updateProfile` mutation.
#[derive(Clone, Debug)]
pub struct UserOutput {
    pub id: Uuid,
    pub cognito_sub: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: String,
    pub encounter_detection_enabled: bool,
}

impl From<crate::entities::users::Model> for UserOutput {
    fn from(m: crate::entities::users::Model) -> Self {
        let created: chrono::DateTime<chrono::Utc> = m.created_at.into();
        Self {
            id: m.id,
            cognito_sub: m.cognito_sub,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
            created_at: created.to_rfc3339(),
            encounter_detection_enabled: m.encounter_detection_enabled,
        }
    }
}

/// Returned by `signUp`.
#[derive(Clone, Debug)]
pub struct SignUpOutput {
    pub success: bool,
    pub user_confirmed: bool,
}

/// Returned by `signIn`.
#[derive(Clone, Debug)]
pub struct SignInOutput {
    pub access_token: String,
    pub refresh_token: String,
}

pub fn user_output_type() -> Object {
    Object::new("UserOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "cognitoSub",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.cognito_sub.clone())))
                })
            },
        ))
        .field(Field::new(
            "displayName",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(u.display_name.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "avatarUrl",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(u.avatar_url.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "dogs",
            TypeRef::named_nn_list_nn("DogOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    use crate::entities::dog_members::{self, Entity as DogMemberEntity};
                    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    let user_id = u.id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    let dogs =
                        crate::services::dog_service::get_dogs_by_user_id(&state.db, user_id)
                            .await
                            .map_err(crate::error::AppError::into_graphql_error)?;

                    // Fetch memberships to get role for each dog
                    let dog_ids: Vec<Uuid> = dogs.iter().map(|d| d.id).collect();
                    let memberships = DogMemberEntity::find()
                        .filter(dog_members::Column::UserId.eq(user_id))
                        .filter(dog_members::Column::DogId.is_in(dog_ids))
                        .all(&state.db)
                        .await
                        .map_err(|e| AppError::Database(e).into_graphql_error())?;

                    let values: Vec<FieldValue> = dogs
                        .into_iter()
                        .map(|d| {
                            let role = memberships
                                .iter()
                                .find(|m| m.dog_id == d.id)
                                .map(|m| m.role.clone());
                            let mut output = super::dog::DogOutput::from(d);
                            output.role = role;
                            FieldValue::owned_any(output)
                        })
                        .collect();
                    Ok(Some(FieldValue::list(values)))
                })
            },
        ))
        .field(Field::new(
            "createdAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.created_at.clone())))
                })
            },
        ))
        .field(Field::new(
            "encounterDetectionEnabled",
            TypeRef::named_nn(TypeRef::BOOLEAN),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.encounter_detection_enabled)))
                })
            },
        ))
}

pub fn sign_up_output_type() -> Object {
    Object::new("SignUpOutput")
        .field(Field::new(
            "success",
            TypeRef::named_nn(TypeRef::BOOLEAN),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignUpOutput>()?;
                    Ok(Some(FieldValue::value(s.success)))
                })
            },
        ))
        .field(Field::new(
            "userConfirmed",
            TypeRef::named_nn(TypeRef::BOOLEAN),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignUpOutput>()?;
                    Ok(Some(FieldValue::value(s.user_confirmed)))
                })
            },
        ))
}

pub fn sign_in_output_type() -> Object {
    Object::new("SignInOutput")
        .field(Field::new(
            "accessToken",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignInOutput>()?;
                    Ok(Some(FieldValue::value(s.access_token.clone())))
                })
            },
        ))
        .field(Field::new(
            "refreshToken",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignInOutput>()?;
                    Ok(Some(FieldValue::value(s.refresh_token.clone())))
                })
            },
        ))
}

pub fn update_profile_input_type() -> InputObject {
    InputObject::new("UpdateProfileInput").field(InputValue::new(
        "displayName",
        TypeRef::named(TypeRef::STRING),
    ))
}

pub fn sign_up_input_type() -> InputObject {
    InputObject::new("SignUpInput")
        .field(InputValue::new("email", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new(
            "password",
            TypeRef::named_nn(TypeRef::STRING),
        ))
        .field(InputValue::new(
            "displayName",
            TypeRef::named_nn(TypeRef::STRING),
        ))
}

pub fn confirm_sign_up_input_type() -> InputObject {
    InputObject::new("ConfirmSignUpInput")
        .field(InputValue::new("email", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new("code", TypeRef::named_nn(TypeRef::STRING)))
}

pub fn sign_in_input_type() -> InputObject {
    InputObject::new("SignInInput")
        .field(InputValue::new("email", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new(
            "password",
            TypeRef::named_nn(TypeRef::STRING),
        ))
}

pub fn refresh_token_input_type() -> InputObject {
    InputObject::new("RefreshTokenInput").field(InputValue::new(
        "refreshToken",
        TypeRef::named_nn(TypeRef::STRING),
    ))
}

pub fn sign_up_field(state: Arc<AppState>) -> Field {
    Field::new("signUp", TypeRef::named_nn("SignUpOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let input = ctx.args.try_get("input")?.object()?;
            let email = input.try_get("email")?.string()?.to_string();
            let password = input.try_get("password")?.string()?.to_string();
            let display_name = input.try_get("displayName")?.string()?.to_string();

            let result = auth::service::sign_up_with_profile(
                &state.cognito,
                &state.config.cognito_client_id,
                &state.db,
                &email,
                &password,
                &display_name,
            )
            .await
            .map_err(AppError::into_graphql_error)?;

            Ok(Some(FieldValue::owned_any(SignUpOutput {
                success: true,
                user_confirmed: result.user_confirmed,
            })))
        })
    })
    .argument(InputValue::new("input", TypeRef::named_nn("SignUpInput")))
}

pub fn confirm_sign_up_field(state: Arc<AppState>) -> Field {
    Field::new(
        "confirmSignUp",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let input = ctx.args.try_get("input")?.object()?;
                let email = input.try_get("email")?.string()?.to_string();
                let code = input.try_get("code")?.string()?.to_string();

                auth::service::confirm_sign_up(
                    &state.cognito,
                    &state.config.cognito_client_id,
                    &email,
                    &code,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::value(true)))
            })
        },
    )
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("ConfirmSignUpInput"),
    ))
}

pub fn sign_in_field(state: Arc<AppState>) -> Field {
    Field::new("signIn", TypeRef::named_nn("SignInOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let input = ctx.args.try_get("input")?.object()?;
            let email = input.try_get("email")?.string()?.to_string();
            let password = input.try_get("password")?.string()?.to_string();

            let result = auth::service::sign_in(
                &state.cognito,
                &state.config.cognito_client_id,
                &email,
                &password,
            )
            .await
            .map_err(AppError::into_graphql_error)?;

            Ok(Some(FieldValue::owned_any(SignInOutput {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
            })))
        })
    })
    .argument(InputValue::new("input", TypeRef::named_nn("SignInInput")))
}

pub fn sign_out_field(state: Arc<AppState>) -> Field {
    Field::new("signOut", TypeRef::named_nn(TypeRef::BOOLEAN), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let access_token = ctx.args.try_get("accessToken")?.string()?.to_string();

            auth::service::sign_out(&state.cognito, &access_token)
                .await
                .map_err(AppError::into_graphql_error)?;

            Ok(Some(FieldValue::value(true)))
        })
    })
    .argument(InputValue::new(
        "accessToken",
        TypeRef::named_nn(TypeRef::STRING),
    ))
}

pub fn refresh_token_field(state: Arc<AppState>) -> Field {
    Field::new(
        "refreshToken",
        TypeRef::named_nn("SignInOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let input = ctx.args.try_get("input")?.object()?;
                let refresh_token = input.try_get("refreshToken")?.string()?.to_string();

                let result = auth::service::refresh_token(
                    &state.cognito,
                    &state.config.cognito_client_id,
                    &refresh_token,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::owned_any(SignInOutput {
                    access_token: result.access_token,
                    refresh_token: result.refresh_token,
                })))
            })
        },
    )
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("RefreshTokenInput"),
    ))
}

pub fn update_profile_field(state: Arc<AppState>) -> Field {
    Field::new(
        "updateProfile",
        TypeRef::named_nn("UserOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let cognito_sub = auth::require_auth(&ctx)?;
                let input = ctx.args.try_get("input")?.object()?;
                let display_name = input
                    .get("displayName")
                    .map(|v| v.string().map(|s| s.to_string()))
                    .transpose()?;
                let user = user_service::update_profile(&state.db, &cognito_sub, display_name)
                    .await
                    .map_err(AppError::into_graphql_error)?;
                Ok(Some(FieldValue::owned_any(UserOutput::from(user))))
            })
        },
    )
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("UpdateProfileInput"),
    ))
}

pub fn update_encounter_detection_field(state: Arc<AppState>) -> Field {
    Field::new(
        "updateEncounterDetection",
        TypeRef::named_nn("UserOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                use crate::entities::users;
                use sea_orm::{ActiveModelTrait, Set};

                let enabled = ctx.args.try_get("enabled")?.boolean()?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                let mut active: users::ActiveModel = user.into();
                active.encounter_detection_enabled = Set(enabled);
                let updated = active
                    .update(&state.db)
                    .await
                    .map_err(|e| AppError::Database(e).into_graphql_error())?;

                Ok(Some(FieldValue::owned_any(UserOutput::from(updated))))
            })
        },
    )
    .argument(InputValue::new(
        "enabled",
        TypeRef::named_nn(TypeRef::BOOLEAN),
    ))
}
