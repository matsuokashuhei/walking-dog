use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait};
use tracing::error;
use uuid::Uuid;

use crate::graphql::object::coordinate::{Latitude, Longitude};
use crate::graphql::object::track_point::TrackPoint;
use crate::graphql::util::error::AppError;
use crate::{entity::user, graphql::guard::AuthGuard};

#[derive(Default, Debug)]
pub struct TrackPointMutation;

#[Object]
impl TrackPointMutation {
    #[graphql(guard = "AuthGuard")]
    async fn track_point(&self, ctx: &Context<'_>, input: TrackPointInput) -> Result<TrackPoint> {
        let user = ctx.data::<user::Model>().unwrap();
        let walk = crate::entity::walk::Entity::find_by_id(input.walk_id)
            .has_related(
                crate::entity::user::Entity,
                crate::entity::user::Column::Id.eq(user.id),
            )
            .one(ctx.data::<DatabaseConnection>().unwrap())
            .await?
            .ok_or_else(|| AppError::NotFound)?;
        if walk.ended_at.is_some() {
            return Err(AppError::UnprocessableEntity(
                "Cannot track point for an ended walk".to_string(),
            )
            .into());
        }
        let client = ctx.data::<aws_sdk_dynamodb::Client>().unwrap();
        let track_point = crate::entity::track_point::Model::new(
            input.walk_id,
            input.tracked_at,
            input.latitude.value(),
            input.longitude.value(),
        );
        let model = track_point.put(client).await?;
        Ok(TrackPoint::from(model))
    }
}

#[derive(Debug, InputObject)]
struct TrackPointInput {
    walk_id: Uuid,
    tracked_at: chrono::DateTime<chrono::Utc>,
    latitude: Latitude,
    longitude: Longitude,
}
