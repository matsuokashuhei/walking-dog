use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait};
use std::sync::Arc;
use uuid::Uuid;

use crate::graphql::{
    error::AppError,
    object::{
        coordinate::{Latitude, Longitude},
        track_point::TrackPointReceipt,
    },
};
use crate::queue::track_point::{TrackPointEnqueuer, TrackPointMessage};
use crate::util::error::format_error_chain;
use crate::{entity::user, graphql::guard::AuthGuard};

#[derive(Default, Debug)]
pub struct TrackPointMutation;

#[Object]
impl TrackPointMutation {
    #[graphql(guard = "AuthGuard")]
    async fn track_point(
        &self,
        ctx: &Context<'_>,
        input: TrackPointInput,
    ) -> Result<TrackPointReceipt> {
        let user = ctx.data::<user::Model>().unwrap();
        let walk = crate::entity::walk::Entity::find_by_id(input.walk_id)
            .has_related(
                crate::entity::user::Entity,
                crate::entity::user::Column::Id.eq(user.id),
            )
            .one(ctx.data::<DatabaseConnection>().unwrap())
            .await?
            .ok_or(AppError::NotFound)?;
        if walk.ended_at.is_some() {
            return Err(AppError::UnprocessableEntity(
                "Cannot track point for an ended walk".to_string(),
            )
            .into());
        }

        let accepted_at = chrono::Utc::now();
        let message = TrackPointMessage::new(
            input.walk_id,
            input.tracked_at,
            input.latitude.value(),
            input.longitude.value(),
            accepted_at,
        );
        let track_point_enqueuer = ctx.data::<Arc<TrackPointEnqueuer>>().map_err(|_| {
            AppError::InternalServerError("Track point enqueuer is not configured".to_string())
        })?;
        track_point_enqueuer
            .enqueue(&message)
            .await
            .map_err(|error| {
                let error_chain = format_error_chain(&error);
                tracing::error!(
                    error = ?error,
                    %error_chain,
                    "enqueue_track_point error"
                );
                AppError::InternalServerError(format!("enqueue_track_point error: {error_chain}"))
            })?;

        Ok(TrackPointReceipt {
            walk_id: input.walk_id,
            tracked_at: input.tracked_at,
            accepted_at,
        })
    }
}

#[derive(Debug, InputObject)]
struct TrackPointInput {
    walk_id: Uuid,
    tracked_at: chrono::DateTime<chrono::Utc>,
    latitude: Latitude,
    longitude: Longitude,
}
