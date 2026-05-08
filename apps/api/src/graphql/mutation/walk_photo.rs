use anyhow::Result;
use async_graphql::{Context, InputObject, Object, Upload};
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter};
use uuid::Uuid;

use crate::entity::{user, walk, walk_photo};
use crate::graphql::{error::AppError, guard::AuthGuard, object::walk_photo::WalkPhoto};
use crate::storage::upload_walk_photo;

#[derive(Default, Debug)]
pub struct WalkPhotoMutation;

#[Object]
impl WalkPhotoMutation {
    #[graphql(guard = "AuthGuard")]
    async fn take_photo(&self, ctx: &Context<'_>, input: TakePhotoInput) -> Result<WalkPhoto> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let Some(_) = walk::Entity::find_by_id(input.walk_id)
            .filter(walk::Column::UserId.eq(user.id))
            .one(db)
            .await?
        else {
            return Err(AppError::NotFound.into());
        };

        let file = upload_walk_photo(ctx, input.file).await?;
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
