use crate::error::{AppError, FieldError};
use crate::graphql::auth_helpers;
use crate::services::{dog_member_service, walk_event_service, walk_points_service, walk_service};
use crate::AppState;
use async_graphql::dynamic::{
    Field, FieldFuture, FieldValue, InputObject, InputValue, Object, TypeRef,
};
use std::sync::Arc;
use uuid::Uuid;

/// Returned by `startWalk` and `finishWalk`.
#[derive(Clone, Debug)]
pub struct WalkOutput {
    pub id: Uuid,
    pub user_id: Uuid,
    pub status: String,
    pub distance_m: Option<i32>,
    pub duration_sec: Option<i32>,
    pub started_at: String,
    pub ended_at: Option<String>,
}

impl From<crate::entities::walks::Model> for WalkOutput {
    fn from(m: crate::entities::walks::Model) -> Self {
        let started: chrono::DateTime<chrono::Utc> = m.started_at.into();
        let ended: Option<chrono::DateTime<chrono::Utc>> = m.ended_at.map(|t| t.into());
        Self {
            id: m.id,
            user_id: m.user_id,
            status: m.status.to_string(),
            distance_m: m.distance_m,
            duration_sec: m.duration_sec,
            started_at: started.to_rfc3339(),
            ended_at: ended.map(|t| t.to_rfc3339()),
        }
    }
}

/// Walker info resolved from WalkOutput.user_id.
#[derive(Clone, Debug)]
pub struct WalkerOutput {
    pub id: Uuid,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

impl From<crate::entities::users::Model> for WalkerOutput {
    fn from(m: crate::entities::users::Model) -> Self {
        Self {
            id: m.id,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
        }
    }
}

pub fn walk_output_type() -> Object {
    Object::new("WalkOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    Ok(Some(FieldValue::value(w.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "status",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    Ok(Some(FieldValue::value(w.status.clone())))
                })
            },
        ))
        .field(Field::new(
            "distanceM",
            TypeRef::named(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    Ok(w.distance_m.map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "durationSec",
            TypeRef::named(TypeRef::INT),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    Ok(w.duration_sec.map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "startedAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    Ok(Some(FieldValue::value(w.started_at.clone())))
                })
            },
        ))
        .field(Field::new(
            "endedAt",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    Ok(w.ended_at.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "walker",
            TypeRef::named("WalkerOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    use crate::entities::users::Entity as UserEntity;
                    use sea_orm::EntityTrait;

                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    let user_id = w.user_id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;

                    let user = UserEntity::find_by_id(user_id)
                        .one(&state.db)
                        .await
                        .map_err(|e| AppError::Database(e).into_graphql_error())?;

                    Ok(user.map(|u| FieldValue::owned_any(WalkerOutput::from(u))))
                })
            },
        ))
        .field(Field::new(
            "dogs",
            TypeRef::named_nn_list_nn("DogOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    use crate::entities::{
                        dogs::{self, Entity as DogEntity},
                        walk_dogs::{self, Entity as WalkDogEntity},
                    };
                    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    let walk_id = w.id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;

                    let walk_dog_rows = WalkDogEntity::find()
                        .filter(walk_dogs::Column::WalkId.eq(walk_id))
                        .all(&state.db)
                        .await
                        .map_err(|e| AppError::Database(e).into_graphql_error())?;
                    let dog_ids: Vec<Uuid> = walk_dog_rows.iter().map(|wd| wd.dog_id).collect();

                    let dogs = DogEntity::find()
                        .filter(dogs::Column::Id.is_in(dog_ids))
                        .all(&state.db)
                        .await
                        .map_err(|e| AppError::Database(e).into_graphql_error())?;

                    let values: Vec<FieldValue> = dogs
                        .into_iter()
                        .map(|d| FieldValue::owned_any(super::dog::DogOutput::from(d)))
                        .collect();
                    Ok(Some(FieldValue::list(values)))
                })
            },
        ))
        .field(Field::new(
            "points",
            TypeRef::named_nn_list_nn("WalkPointOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    let walk_id = w.id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;

                    let points = walk_points_service::get_walk_points(
                        &state.dynamo,
                        &state.config.dynamodb_table_walk_points,
                        walk_id,
                    )
                    .await
                    .map_err(AppError::into_graphql_error)?;

                    let values: Vec<FieldValue> = points
                        .into_iter()
                        .map(|p| {
                            FieldValue::owned_any(
                                crate::graphql::custom_queries::WalkPointOutput::from(p),
                            )
                        })
                        .collect();
                    Ok(Some(FieldValue::list(values)))
                })
            },
        ))
        .field(Field::new(
            "events",
            TypeRef::named_nn_list_nn("WalkEventOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                    let walk_id = w.id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;

                    let events = walk_event_service::list_events(&state.db, walk_id)
                        .await
                        .map_err(AppError::into_graphql_error)?;

                    let values: Vec<FieldValue> = events
                        .into_iter()
                        .map(|e| FieldValue::owned_any(super::walk_event::WalkEventOutput::from(e)))
                        .collect();
                    Ok(Some(FieldValue::list(values)))
                })
            },
        ))
}

pub fn walk_point_output_type() -> Object {
    Object::new("WalkPointOutput")
        .field(Field::new(
            "lat",
            TypeRef::named_nn(TypeRef::FLOAT),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx
                        .parent_value
                        .try_downcast_ref::<crate::graphql::custom_queries::WalkPointOutput>()?;
                    Ok(Some(FieldValue::value(p.lat)))
                })
            },
        ))
        .field(Field::new(
            "lng",
            TypeRef::named_nn(TypeRef::FLOAT),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx
                        .parent_value
                        .try_downcast_ref::<crate::graphql::custom_queries::WalkPointOutput>()?;
                    Ok(Some(FieldValue::value(p.lng)))
                })
            },
        ))
        .field(Field::new(
            "recordedAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx
                        .parent_value
                        .try_downcast_ref::<crate::graphql::custom_queries::WalkPointOutput>()?;
                    Ok(Some(FieldValue::value(p.recorded_at.clone())))
                })
            },
        ))
}

pub fn walker_output_type() -> Object {
    Object::new("WalkerOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkerOutput>()?;
                    Ok(Some(FieldValue::value(w.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "displayName",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkerOutput>()?;
                    Ok(w.display_name.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "avatarUrl",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let w = ctx.parent_value.try_downcast_ref::<WalkerOutput>()?;
                    Ok(w.avatar_url.clone().map(FieldValue::value))
                })
            },
        ))
}

pub fn walk_point_input_type() -> InputObject {
    InputObject::new("WalkPointInput")
        .field(InputValue::new("lat", TypeRef::named_nn(TypeRef::FLOAT)))
        .field(InputValue::new("lng", TypeRef::named_nn(TypeRef::FLOAT)))
        .field(InputValue::new(
            "recordedAt",
            TypeRef::named_nn(TypeRef::STRING),
        ))
}

pub fn start_walk_field(state: Arc<AppState>) -> Field {
    Field::new("startWalk", TypeRef::named_nn("WalkOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let dog_ids_raw = ctx.args.try_get("dogIds")?;
            let dog_ids = dog_ids_raw
                .list()?
                .iter()
                .map(|v| {
                    let s = v.string()?;
                    Uuid::parse_str(s).map_err(|_| async_graphql::Error::new("Invalid dog ID"))
                })
                .collect::<Result<Vec<Uuid>, _>>()?;

            let user = auth_helpers::resolve_user(&ctx, &state).await?;
            // Verify membership for each dog
            for dog_id in &dog_ids {
                dog_member_service::require_dog_member(&state.db, *dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;
            }
            let walk = walk_service::start_walk(&state.db, user.id, dog_ids)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(WalkOutput::from(walk))))
        })
    })
    .argument(InputValue::new(
        "dogIds",
        TypeRef::named_nn_list_nn(TypeRef::ID),
    ))
}

pub fn finish_walk_field(state: Arc<AppState>) -> Field {
    Field::new("finishWalk", TypeRef::named_nn("WalkOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let walk_id_str = ctx.args.try_get("walkId")?.string()?;
            let walk_id = Uuid::parse_str(walk_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;
            let distance_m = ctx
                .args
                .get("distanceM")
                .and_then(|v| v.i64().ok())
                .map(|v| v as i32);

            let user = auth_helpers::resolve_user(&ctx, &state).await?;
            let walk = walk_service::finish_walk(&state.db, walk_id, user.id, distance_m)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(WalkOutput::from(walk))))
        })
    })
    .argument(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("distanceM", TypeRef::named(TypeRef::INT)))
}

pub fn add_walk_points_field(state: Arc<AppState>) -> Field {
    Field::new(
        "addWalkPoints",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                use crate::entities::{walks, walks::Entity as WalkEntity};
                use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

                let walk_id_str = ctx.args.try_get("walkId")?.string()?;

                let mut field_errors: Vec<FieldError> = Vec::new();
                let walk_id_opt = Uuid::parse_str(walk_id_str).ok().or_else(|| {
                    field_errors.push(FieldError {
                        field: "walkId".to_string(),
                        message: "Invalid UUID format".to_string(),
                    });
                    None
                });
                if !field_errors.is_empty() {
                    return Err(AppError::ValidationErrors(field_errors).into_graphql_error());
                }
                let walk_id = walk_id_opt.unwrap();

                let user = auth_helpers::resolve_user(&ctx, &state).await?;
                // Only the walk owner can add points (walks.user_id check)
                WalkEntity::find_by_id(walk_id)
                    .filter(walks::Column::UserId.eq(user.id))
                    .one(&state.db)
                    .await
                    .map_err(|e| AppError::Database(e).into_graphql_error())?
                    .ok_or_else(|| async_graphql::Error::new("Walk not found"))?;

                let points_raw = ctx.args.try_get("points")?.list()?;
                let points: Vec<walk_points_service::WalkPointInput> = points_raw
                    .iter()
                    .map(|v| {
                        let obj = v.object()?;
                        let lat = obj.try_get("lat")?.f64()?;
                        let lng = obj.try_get("lng")?.f64()?;
                        let recorded_at = obj.try_get("recordedAt")?.string()?.to_string();
                        Ok(walk_points_service::WalkPointInput {
                            lat,
                            lng,
                            recorded_at,
                        })
                    })
                    .collect::<Result<_, async_graphql::Error>>()?;

                let result = walk_points_service::add_walk_points(
                    &state.dynamo,
                    &state.config.dynamodb_table_walk_points,
                    walk_id,
                    points,
                )
                .await
                .map_err(AppError::into_graphql_error)?;
                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "points",
        TypeRef::named_nn_list_nn("WalkPointInput"),
    ))
}
