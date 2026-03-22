use async_graphql::dynamic::{Field, FieldFuture, FieldValue, InputObject, InputValue, Object, TypeRef};
use std::sync::Arc;
use uuid::Uuid;
use crate::AppState;
use crate::error::AppError;
use crate::services::{user_service, walk_service, walk_points_service};
use super::custom_mutations::{UserOutput, WalkOutput};

// ─── Custom output types ──────────────────────────────────────────────────────

/// GPS point returned by `walkPoints` query.
#[derive(Clone, Debug)]
pub struct WalkPointOutput {
    pub lat: f64,
    pub lng: f64,
    pub recorded_at: String,
}

impl From<walk_points_service::WalkPoint> for WalkPointOutput {
    fn from(p: walk_points_service::WalkPoint) -> Self {
        Self {
            lat: p.lat,
            lng: p.lng,
            recorded_at: p.recorded_at,
        }
    }
}

/// Walk statistics returned by `dogWalkStats` query.
#[derive(Clone, Debug)]
pub struct WalkStatsOutput {
    pub total_walks: i32,
    pub total_distance_m: i32,
    pub total_duration_sec: i32,
}

impl From<walk_service::WalkStats> for WalkStatsOutput {
    fn from(s: walk_service::WalkStats) -> Self {
        Self {
            total_walks: s.total_walks,
            total_distance_m: s.total_distance_m,
            total_duration_sec: s.total_duration_sec,
        }
    }
}

// ─── Dynamic Object type definitions ─────────────────────────────────────────

pub fn walk_point_type() -> Object {
    Object::new("WalkPoint")
        .field(Field::new("lat", TypeRef::named_nn(TypeRef::FLOAT), |ctx| {
            FieldFuture::new(async move {
                let p = ctx.parent_value.try_downcast_ref::<WalkPointOutput>()?;
                Ok(Some(FieldValue::value(p.lat)))
            })
        }))
        .field(Field::new("lng", TypeRef::named_nn(TypeRef::FLOAT), |ctx| {
            FieldFuture::new(async move {
                let p = ctx.parent_value.try_downcast_ref::<WalkPointOutput>()?;
                Ok(Some(FieldValue::value(p.lng)))
            })
        }))
        .field(Field::new("recordedAt", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let p = ctx.parent_value.try_downcast_ref::<WalkPointOutput>()?;
                Ok(Some(FieldValue::value(p.recorded_at.clone())))
            })
        }))
}

pub fn walk_stats_type() -> Object {
    Object::new("WalkStats")
        .field(Field::new("totalWalks", TypeRef::named_nn(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let s = ctx.parent_value.try_downcast_ref::<WalkStatsOutput>()?;
                Ok(Some(FieldValue::value(s.total_walks)))
            })
        }))
        .field(Field::new("totalDistanceM", TypeRef::named_nn(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let s = ctx.parent_value.try_downcast_ref::<WalkStatsOutput>()?;
                Ok(Some(FieldValue::value(s.total_distance_m)))
            })
        }))
        .field(Field::new("totalDurationSec", TypeRef::named_nn(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let s = ctx.parent_value.try_downcast_ref::<WalkStatsOutput>()?;
                Ok(Some(FieldValue::value(s.total_duration_sec)))
            })
        }))
}

/// `UpdateProfileInput` input type (used by `updateProfile` mutation).
pub fn update_profile_input_type() -> InputObject {
    InputObject::new("UpdateProfileInput")
        .field(InputValue::new("displayName", TypeRef::named(TypeRef::STRING)))
}

// ─── Query fields ─────────────────────────────────────────────────────────────

pub fn query_fields(state: Arc<AppState>) -> Vec<Field> {
    vec![
        me_field(state.clone()),
        my_walks_field(state.clone()),
        dog_walk_stats_field(state.clone()),
        walk_points_field(state),
    ]
}

fn my_walks_field(state: Arc<AppState>) -> Field {
    Field::new("myWalks", TypeRef::named_nn_list_nn("WalkOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
            let walks = walk_service::get_walks_by_user_id(&state.db, user.id)
                .await
                .map_err(AppError::into_graphql_error)?;
            let values: Vec<FieldValue> = walks
                .into_iter()
                .map(|w| FieldValue::owned_any(WalkOutput::from(w)))
                .collect();
            Ok(Some(FieldValue::list(values)))
        })
    })
}

fn me_field(state: Arc<AppState>) -> Field {
    Field::new("me", TypeRef::named_nn("UserOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(UserOutput::from(user))))
        })
    })
}

fn dog_walk_stats_field(state: Arc<AppState>) -> Field {
    Field::new("dogWalkStats", TypeRef::named_nn("WalkStats"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let dog_id_str = ctx.args.try_get("dogId")?.string()?;
            let dog_id = Uuid::parse_str(dog_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
            let period = ctx.args.try_get("period")?.string()?;
            let stats = walk_service::get_walk_stats(&state.db, dog_id, period)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(WalkStatsOutput::from(stats))))
        })
    })
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("period", TypeRef::named_nn(TypeRef::STRING)))
}

fn walk_points_field(state: Arc<AppState>) -> Field {
    Field::new("walkPoints", TypeRef::named_nn_list_nn("WalkPoint"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let walk_id_str = ctx.args.try_get("walkId")?.string()?;
            let walk_id = Uuid::parse_str(walk_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;
            let points = walk_points_service::get_walk_points(
                &state.dynamo,
                &state.config.dynamodb_table_walk_points,
                walk_id,
            )
            .await
            .map_err(AppError::into_graphql_error)?;

            let values: Vec<FieldValue> = points
                .into_iter()
                .map(|p| FieldValue::owned_any(WalkPointOutput::from(p)))
                .collect();
            Ok(Some(FieldValue::list(values)))
        })
    })
    .argument(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
}
