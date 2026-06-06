use anyhow::Result;
use async_graphql::{Context, InputObject, Object, Upload};
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue::Set;
use uuid::Uuid;

use crate::entity::{user, walk_photo};
use crate::graphql::upload::storage_upload_from_graphql;
use crate::graphql::{error::AppError, guard::AuthGuard, object::walk_photo::WalkPhoto};
use crate::service::storage::SharedStorageGateway;
use crate::service::walk as walk_service;

#[derive(Default, Debug)]
pub struct WalkPhotoMutation;

#[Object]
impl WalkPhotoMutation {
    #[graphql(guard = "AuthGuard")]
    async fn take_photo(&self, ctx: &Context<'_>, input: TakePhotoInput) -> Result<WalkPhoto> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        walk_service::ensure_walk_belongs_to_user(db, user.id, input.walk_id)
            .await
            .map_err(AppError::from)?;

        let storage = ctx.data::<SharedStorageGateway>().unwrap();
        let upload = storage_upload_from_graphql(ctx, input.file, storage.max_upload_bytes())?;
        let file = storage.put_walk_photo(upload).await?;
        let walk_photo = walk_photo::ActiveModel {
            walk_id: Set(input.walk_id),
            occurred_at: Set(input.occurred_at.into()),
            file: Set(file),
            latitude: Set(input.latitude),
            longitude: Set(input.longitude),
            ..Default::default()
        }
        .insert(db)
        .await?;

        Ok(WalkPhoto::from(walk_photo))
    }
}

#[derive(Debug, InputObject)]
struct TakePhotoInput {
    walk_id: Uuid,
    occurred_at: chrono::DateTime<chrono::Utc>,
    file: Upload,
    latitude: f64,
    longitude: f64,
}
