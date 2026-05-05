use crate::error::AppError;
use crate::graphql::auth_helpers;
use crate::graphql::dynamic_helpers::{parse_uuid, string_field};
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
        .field(string_field("url", |p: &PresignedUrlOutput| p.url.clone()))
        .field(string_field("key", |p: &PresignedUrlOutput| p.key.clone()))
        .field(string_field("expiresAt", |p: &PresignedUrlOutput| {
            p.expires_at.clone()
        }))
}

pub fn generate_dog_photo_upload_url_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateDogPhotoUploadUrl",
        TypeRef::named_nn("PresignedUrlOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = parse_uuid(dog_id_str, "Invalid dog ID")?;
                let content_type = ctx.args.try_get("contentType")?.string()?.to_string();

                auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

                let presigned = s3_service::generate_dog_photo_upload_url(
                    &state.s3_presign,
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
                let walk_id = parse_uuid(walk_id_str, "Invalid walk ID")?;
                let content_type = ctx.args.try_get("contentType")?.string()?.to_string();

                auth_helpers::resolve_user_and_walk(&ctx, &state, walk_id).await?;

                let presigned = s3_service::generate_walk_event_photo_upload_url(
                    &state.s3_presign,
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
