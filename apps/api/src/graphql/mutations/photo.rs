use crate::error::AppError;
use crate::graphql::auth_helpers;
use crate::services::s3_service;
use crate::AppState;
use async_graphql::dynamic::{Field, FieldFuture, FieldValue, InputValue, Object, TypeRef};
use std::sync::Arc;

/// Returned by `generateDogPhotoUploadUrl`.
#[derive(Clone, Debug)]
pub struct PresignedUrlOutput {
    pub url: String,
    pub key: String,
    pub expires_at: String,
}

pub fn presigned_url_type() -> Object {
    Object::new("PresignedUrlOutput")
        .field(Field::new(
            "url",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                    Ok(Some(FieldValue::value(p.url.clone())))
                })
            },
        ))
        .field(Field::new(
            "key",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                    Ok(Some(FieldValue::value(p.key.clone())))
                })
            },
        ))
        .field(Field::new(
            "expiresAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                    Ok(Some(FieldValue::value(p.expires_at.clone())))
                })
            },
        ))
}

pub fn generate_dog_photo_upload_url_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateDogPhotoUploadUrl",
        TypeRef::named_nn("PresignedUrlOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = uuid::Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
                let content_type = ctx.args.try_get("contentType")?.string()?.to_string();

                auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

                let presigned = s3_service::generate_dog_photo_upload_url(
                    &state.s3,
                    &state.config.s3_bucket_dog_photos,
                    dog_id,
                    &content_type,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::owned_any(PresignedUrlOutput {
                    url: presigned.url,
                    key: presigned.key,
                    expires_at: presigned.expires_at.to_rfc3339(),
                })))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "contentType",
        TypeRef::named_nn(TypeRef::STRING),
    ))
}

pub fn generate_walk_event_photo_upload_url_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateWalkEventPhotoUploadUrl",
        TypeRef::named_nn("PresignedUrlOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let walk_id_str = ctx.args.try_get("walkId")?.string()?;
                let walk_id = uuid::Uuid::parse_str(walk_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;
                let content_type = ctx.args.try_get("contentType")?.string()?.to_string();

                auth_helpers::resolve_user_and_walk(&ctx, &state, walk_id).await?;

                let presigned = s3_service::generate_walk_event_photo_upload_url(
                    &state.s3,
                    &state.config.s3_bucket_dog_photos,
                    walk_id,
                    &content_type,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::owned_any(PresignedUrlOutput {
                    url: presigned.url,
                    key: presigned.key,
                    expires_at: presigned.expires_at.to_rfc3339(),
                })))
            })
        },
    )
    .argument(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "contentType",
        TypeRef::named_nn(TypeRef::STRING),
    ))
}
