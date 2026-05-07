use anyhow::{Result, anyhow};
use async_graphql::{Context, InputObject, Object};
use sea_orm::{ColumnTrait, EntityTrait};
use tracing::{error, info};
use uuid::Uuid;

use crate::graphql::object::coordinate::{Latitude, Longitude};
use crate::graphql::object::track_point::TrackPoint;
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
            .one(ctx.data::<sea_orm::DatabaseConnection>().unwrap())
            .await?
            .ok_or_else(|| anyhow!("Walk not found or not owned by user"))?;
        if walk.ended_at.is_some() {
            return Err(anyhow!("Cannot track point for an ended walk"));
        }
        let client = ctx.data::<aws_sdk_dynamodb::Client>().unwrap();
        let track_point = crate::entity::track_point::Model::new(
            input.walk_id,
            input.tracked_at,
            input.latitude.value(),
            input.longitude.value(),
        );
        info!(
            "Tracking point for walk_id {}: ({}, {}) at {}",
            input.walk_id,
            input.latitude.value(),
            input.longitude.value(),
            input.tracked_at
        );
        let model = track_point.put(client).await.map_err(|e| {
            error!("Failed to put track point: {:?}", e);
            anyhow!(e)
        })?;
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
