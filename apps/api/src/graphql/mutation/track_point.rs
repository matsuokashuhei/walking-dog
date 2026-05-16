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
use crate::queue::track_point::{TrackPointEnqueuer, TrackPointMessage, TrackPointQueueError};
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
            .map_err(map_track_point_enqueue_error)?;

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

fn map_track_point_enqueue_error(error: TrackPointQueueError) -> AppError {
    let error_chain = format_error_chain(&error);
    tracing::error!(
        error = ?error,
        %error_chain,
        "enqueue_track_point error"
    );
    AppError::InternalServerError(format!("enqueue_track_point error: {error_chain}"))
}

#[cfg(test)]
mod tests {
    use std::error::Error as _;

    use aws_sdk_sqs::operation::send_message::SendMessageError;

    use super::*;
    use crate::queue::track_point::TrackPointQueueError;

    #[test]
    fn enqueue_error_mapping_preserves_send_message_source_chain() {
        #[derive(Debug)]
        struct ThrottlingException;

        impl std::fmt::Display for ThrottlingException {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "ThrottlingException")
            }
        }

        impl std::error::Error for ThrottlingException {}

        #[derive(Debug)]
        struct SendMessageFailure(ThrottlingException);

        impl std::fmt::Display for SendMessageFailure {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "SendMessage failed")
            }
        }

        impl std::error::Error for SendMessageFailure {
            fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
                Some(&self.0)
            }
        }

        let error = TrackPointQueueError::SendMessage(Box::new(SendMessageError::unhandled(
            SendMessageFailure(ThrottlingException),
        )));
        assert!(error.source().is_some());

        let AppError::InternalServerError(reason) = map_track_point_enqueue_error(error) else {
            panic!("enqueue failures must map to internal server errors");
        };

        assert!(reason.contains("enqueue_track_point error"), "{reason}");
        assert!(reason.contains("SQS send message error"), "{reason}");
        assert!(reason.contains("SendMessage failed"), "{reason}");
        assert!(reason.contains("ThrottlingException"), "{reason}");
    }
}
