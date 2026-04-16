use super::auth_helpers;
use super::mutations::{DogOutput, UserOutput, WalkOutput};
use crate::error::AppError;
use crate::services::{
    dog_member_service, dog_service, encounter_service, friendship_service, walk_points_service,
    walk_service,
};
use crate::AppState;
use async_graphql::dynamic::{Field, FieldFuture, FieldValue, InputValue, Object, TypeRef};
use std::sync::Arc;
use uuid::Uuid;

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

/// Encounter returned by `dogEncounters` query and `recordEncounter` mutation.
#[derive(Clone, Debug)]
pub struct EncounterOutput {
    pub id: Uuid,
    pub dog_id_1: Uuid,
    pub dog_id_2: Uuid,
    pub duration_sec: i32,
    pub met_at: String,
}

impl From<crate::entities::encounters::Model> for EncounterOutput {
    fn from(m: crate::entities::encounters::Model) -> Self {
        let met: chrono::DateTime<chrono::Utc> = m.met_at.into();
        Self {
            id: m.id,
            dog_id_1: m.dog_id_1,
            dog_id_2: m.dog_id_2,
            duration_sec: m.duration_sec,
            met_at: met.to_rfc3339(),
        }
    }
}

/// Friendship returned by `dogFriends` and `friendship` queries.
#[derive(Clone, Debug)]
pub struct FriendshipOutput {
    pub id: Uuid,
    pub dog_id_1: Uuid,
    pub dog_id_2: Uuid,
    /// The requesting dog id, used to resolve the `friend` field.
    pub requesting_dog_id: Uuid,
    pub encounter_count: i32,
    pub total_interaction_sec: i32,
    pub first_met_at: String,
    pub last_met_at: String,
}

impl FriendshipOutput {
    pub fn from_model(m: crate::entities::friendships::Model, requesting_dog_id: Uuid) -> Self {
        let first: chrono::DateTime<chrono::Utc> = m.first_met_at.into();
        let last: chrono::DateTime<chrono::Utc> = m.last_met_at.into();
        Self {
            id: m.id,
            dog_id_1: m.dog_id_1,
            dog_id_2: m.dog_id_2,
            requesting_dog_id,
            encounter_count: m.encounter_count,
            total_interaction_sec: m.total_interaction_sec,
            first_met_at: first.to_rfc3339(),
            last_met_at: last.to_rfc3339(),
        }
    }
}

// ─── Dynamic Object type definitions ─────────────────────────────────────────

pub fn walk_point_type() -> Object {
    Object::new("WalkPoint")
        .field(Field::new(
            "lat",
            TypeRef::named_nn(TypeRef::FLOAT),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<WalkPointOutput>()?;
                    Ok(Some(FieldValue::value(p.lat)))
                })
            },
        ))
        .field(Field::new(
            "lng",
            TypeRef::named_nn(TypeRef::FLOAT),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<WalkPointOutput>()?;
                    Ok(Some(FieldValue::value(p.lng)))
                })
            },
        ))
        .field(Field::new(
            "recordedAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<WalkPointOutput>()?;
                    Ok(Some(FieldValue::value(p.recorded_at.clone())))
                })
            },
        ))
}

pub fn walk_stats_type() -> Object {
    Object::new("WalkStats")
        .field(Field::new(
            "totalWalks",
            TypeRef::named_nn(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<WalkStatsOutput>()?;
                    Ok(Some(FieldValue::value(s.total_walks)))
                })
            },
        ))
        .field(Field::new(
            "totalDistanceM",
            TypeRef::named_nn(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<WalkStatsOutput>()?;
                    Ok(Some(FieldValue::value(s.total_distance_m)))
                })
            },
        ))
        .field(Field::new(
            "totalDurationSec",
            TypeRef::named_nn(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<WalkStatsOutput>()?;
                    Ok(Some(FieldValue::value(s.total_duration_sec)))
                })
            },
        ))
}

pub fn encounter_output_type() -> Object {
    Object::new("EncounterOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<EncounterOutput>()?;
                    Ok(Some(FieldValue::value(e.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "durationSec",
            TypeRef::named_nn(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<EncounterOutput>()?;
                    Ok(Some(FieldValue::value(e.duration_sec)))
                })
            },
        ))
        .field(Field::new(
            "metAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<EncounterOutput>()?;
                    Ok(Some(FieldValue::value(e.met_at.clone())))
                })
            },
        ))
        .field(Field::new("dog1", TypeRef::named_nn("DogOutput"), |ctx| {
            FieldFuture::new(async move {
                use crate::entities::dogs::Entity as DogEntity;
                use sea_orm::EntityTrait;

                let e = ctx.parent_value.try_downcast_ref::<EncounterOutput>()?;
                let dog_id = e.dog_id_1;
                let state = ctx.data::<Arc<crate::AppState>>()?;
                let dog = DogEntity::find_by_id(dog_id)
                    .one(&state.db)
                    .await
                    .map_err(|e| AppError::Database(e).into_graphql_error())?
                    .ok_or_else(|| async_graphql::Error::new("Dog not found"))?;
                Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
            })
        }))
        .field(Field::new("dog2", TypeRef::named_nn("DogOutput"), |ctx| {
            FieldFuture::new(async move {
                use crate::entities::dogs::Entity as DogEntity;
                use sea_orm::EntityTrait;

                let e = ctx.parent_value.try_downcast_ref::<EncounterOutput>()?;
                let dog_id = e.dog_id_2;
                let state = ctx.data::<Arc<crate::AppState>>()?;
                let dog = DogEntity::find_by_id(dog_id)
                    .one(&state.db)
                    .await
                    .map_err(|e| AppError::Database(e).into_graphql_error())?
                    .ok_or_else(|| async_graphql::Error::new("Dog not found"))?;
                Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
            })
        }))
}

pub fn friendship_output_type() -> Object {
    Object::new("FriendshipOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let f = ctx.parent_value.try_downcast_ref::<FriendshipOutput>()?;
                    Ok(Some(FieldValue::value(f.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "encounterCount",
            TypeRef::named_nn(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let f = ctx.parent_value.try_downcast_ref::<FriendshipOutput>()?;
                    Ok(Some(FieldValue::value(f.encounter_count)))
                })
            },
        ))
        .field(Field::new(
            "totalInteractionSec",
            TypeRef::named_nn(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let f = ctx.parent_value.try_downcast_ref::<FriendshipOutput>()?;
                    Ok(Some(FieldValue::value(f.total_interaction_sec)))
                })
            },
        ))
        .field(Field::new(
            "firstMetAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let f = ctx.parent_value.try_downcast_ref::<FriendshipOutput>()?;
                    Ok(Some(FieldValue::value(f.first_met_at.clone())))
                })
            },
        ))
        .field(Field::new(
            "lastMetAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let f = ctx.parent_value.try_downcast_ref::<FriendshipOutput>()?;
                    Ok(Some(FieldValue::value(f.last_met_at.clone())))
                })
            },
        ))
        .field(Field::new(
            "friend",
            TypeRef::named_nn("DogOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    use crate::entities::dogs::Entity as DogEntity;
                    use sea_orm::EntityTrait;

                    let f = ctx.parent_value.try_downcast_ref::<FriendshipOutput>()?;
                    // If requesting dog is dog_id_1, the friend is dog_id_2 and vice versa
                    let friend_id = if f.requesting_dog_id == f.dog_id_1 {
                        f.dog_id_2
                    } else {
                        f.dog_id_1
                    };
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    let dog = DogEntity::find_by_id(friend_id)
                        .one(&state.db)
                        .await
                        .map_err(|e| AppError::Database(e).into_graphql_error())?
                        .ok_or_else(|| async_graphql::Error::new("Dog not found"))?;
                    Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
                })
            },
        ))
}

// ─── Query fields ─────────────────────────────────────────────────────────────

pub fn query_fields(state: Arc<AppState>) -> Vec<Field> {
    vec![
        me_field(state.clone()),
        walk_by_id_field(state.clone()),
        my_walks_field(state.clone()),
        dog_field(state.clone()),
        dog_walk_stats_field(state.clone()),
        walk_points_field(state.clone()),
        dog_friends_field(state.clone()),
        dog_encounters_field(state.clone()),
        friendship_field(state),
    ]
}

fn walk_by_id_field(state: Arc<AppState>) -> Field {
    Field::new("walk", TypeRef::named("WalkOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            use crate::entities::walks::Entity as WalkEntity;
            use sea_orm::EntityTrait;

            let walk_id_str = ctx.args.try_get("id")?.string()?;
            let walk_id = Uuid::parse_str(walk_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;

            auth_helpers::resolve_user_and_walk(&ctx, &state, walk_id).await?;

            let walk = WalkEntity::find_by_id(walk_id)
                .one(&state.db)
                .await
                .map_err(|e| AppError::Database(e).into_graphql_error())?;

            Ok(walk.map(|w| FieldValue::owned_any(WalkOutput::from(w))))
        })
    })
    .argument(InputValue::new("id", TypeRef::named_nn(TypeRef::ID)))
}

fn dog_field(state: Arc<AppState>) -> Field {
    Field::new("dog", TypeRef::named("DogOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let dog_id_str = ctx.args.try_get("id")?.string()?;
            let dog_id = Uuid::parse_str(dog_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

            auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

            let dog = dog_service::get_dog_by_id(&state.db, dog_id)
                .await
                .map_err(AppError::into_graphql_error)?;

            Ok(dog.map(|d| FieldValue::owned_any(super::mutations::DogOutput::from(d))))
        })
    })
    .argument(InputValue::new("id", TypeRef::named_nn(TypeRef::ID)))
}

fn my_walks_field(state: Arc<AppState>) -> Field {
    Field::new(
        "myWalks",
        TypeRef::named_nn_list_nn("WalkOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let limit = ctx
                    .args
                    .get("limit")
                    .and_then(|v| v.i64().ok())
                    .map(|v| v as u64);
                let offset = ctx
                    .args
                    .get("offset")
                    .and_then(|v| v.i64().ok())
                    .map(|v| v as u64);
                let user = auth_helpers::resolve_user(&ctx, &state).await?;
                let walks = walk_service::get_walks_for_user(&state.db, user.id, limit, offset)
                    .await
                    .map_err(AppError::into_graphql_error)?;
                let values: Vec<FieldValue> = walks
                    .into_iter()
                    .map(|w| FieldValue::owned_any(WalkOutput::from(w)))
                    .collect();
                Ok(Some(FieldValue::list(values)))
            })
        },
    )
    .argument(InputValue::new("limit", TypeRef::named(TypeRef::INT)))
    .argument(InputValue::new("offset", TypeRef::named(TypeRef::INT)))
}

fn me_field(state: Arc<AppState>) -> Field {
    Field::new("me", TypeRef::named_nn("UserOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let user = auth_helpers::resolve_user(&ctx, &state).await?;
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

            auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

            let period = ctx.args.try_get("period")?.string()?;
            let stats = walk_service::get_walk_stats(&state.db, dog_id, period)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(WalkStatsOutput::from(stats))))
        })
    })
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "period",
        TypeRef::named_nn(TypeRef::STRING),
    ))
}

fn walk_points_field(state: Arc<AppState>) -> Field {
    Field::new(
        "walkPoints",
        TypeRef::named_nn_list_nn("WalkPoint"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let walk_id_str = ctx.args.try_get("walkId")?.string()?;
                let walk_id = Uuid::parse_str(walk_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;

                auth_helpers::resolve_user_and_walk(&ctx, &state, walk_id).await?;

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
        },
    )
    .argument(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
}

fn dog_friends_field(state: Arc<AppState>) -> Field {
    Field::new(
        "dogFriends",
        TypeRef::named_nn_list_nn("FriendshipOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

                auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

                let friendships = friendship_service::get_friends_for_dog(&state.db, dog_id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                let values: Vec<FieldValue> = friendships
                    .into_iter()
                    .map(|f| FieldValue::owned_any(FriendshipOutput::from_model(f, dog_id)))
                    .collect();
                Ok(Some(FieldValue::list(values)))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
}

fn dog_encounters_field(state: Arc<AppState>) -> Field {
    Field::new(
        "dogEncounters",
        TypeRef::named_nn_list_nn("EncounterOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
                let limit = ctx
                    .args
                    .get("limit")
                    .and_then(|v| v.i64().ok())
                    .map(|v| v as u64);
                let offset = ctx
                    .args
                    .get("offset")
                    .and_then(|v| v.i64().ok())
                    .map(|v| v as u64);

                auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

                let encounters =
                    encounter_service::get_encounters_for_dog(&state.db, dog_id, limit, offset)
                        .await
                        .map_err(AppError::into_graphql_error)?;

                let values: Vec<FieldValue> = encounters
                    .into_iter()
                    .map(|e| FieldValue::owned_any(EncounterOutput::from(e)))
                    .collect();
                Ok(Some(FieldValue::list(values)))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("limit", TypeRef::named(TypeRef::INT)))
    .argument(InputValue::new("offset", TypeRef::named(TypeRef::INT)))
}

fn friendship_field(state: Arc<AppState>) -> Field {
    Field::new(
        "friendship",
        TypeRef::named("FriendshipOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_1_str = ctx.args.try_get("dogId1")?.string()?;
                let dog_id_2_str = ctx.args.try_get("dogId2")?.string()?;
                let dog_id_1 = Uuid::parse_str(dog_id_1_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dogId1"))?;
                let dog_id_2 = Uuid::parse_str(dog_id_2_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dogId2"))?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                // User must be a member of at least one of the two dogs
                let is_member_of_1 =
                    dog_member_service::require_dog_member(&state.db, dog_id_1, user.id)
                        .await
                        .is_ok();
                let is_member_of_2 =
                    dog_member_service::require_dog_member(&state.db, dog_id_2, user.id)
                        .await
                        .is_ok();
                if !is_member_of_1 && !is_member_of_2 {
                    return Err(
                        AppError::Unauthorized("Not a member of either dog".to_string())
                            .into_graphql_error(),
                    );
                }

                let friendship = friendship_service::get_friendship(&state.db, dog_id_1, dog_id_2)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                Ok(friendship
                    .map(|f| FieldValue::owned_any(FriendshipOutput::from_model(f, dog_id_1))))
            })
        },
    )
    .argument(InputValue::new("dogId1", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("dogId2", TypeRef::named_nn(TypeRef::ID)))
}
