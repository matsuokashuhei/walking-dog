use crate::auth;
use crate::error::{AppError, FieldError};
use crate::graphql::auth_helpers;
use crate::graphql::custom_queries::{EncounterOutput, WalkPointOutput};
use crate::graphql::input::birth_date::parse_birth_date_input;
use crate::services::{
    dog_invitation_service, dog_member_service, dog_service, encounter_service, s3_service,
    user_service, walk_event_service, walk_points_service, walk_service,
};
use crate::AppState;
use async_graphql::dynamic::{
    Field, FieldFuture, FieldValue, InputObject, InputValue, Object, TypeRef,
};
use std::sync::Arc;
use uuid::Uuid;

// ─── BirthDate types ─────────────────────────────────────────────────────────

/// Structured birth date parsed from the JSON `birth_date` column.
#[derive(Clone, Debug)]
pub struct BirthDate {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

impl BirthDate {
    pub fn from_json(v: &serde_json::Value) -> Option<Self> {
        let year = v.get("year").and_then(|v| v.as_i64()).map(|v| v as i32);
        let month = v.get("month").and_then(|v| v.as_i64()).map(|v| v as i32);
        let day = v.get("day").and_then(|v| v.as_i64()).map(|v| v as i32);
        if year.is_none() && month.is_none() && day.is_none() {
            return None;
        }
        Some(Self { year, month, day })
    }

    pub fn to_json(year: Option<i32>, month: Option<i32>, day: Option<i32>) -> serde_json::Value {
        let mut map = serde_json::Map::new();
        if let Some(y) = year {
            map.insert("year".into(), y.into());
        }
        if let Some(m) = month {
            map.insert("month".into(), m.into());
        }
        if let Some(d) = day {
            map.insert("day".into(), d.into());
        }
        serde_json::Value::Object(map)
    }
}

pub fn birth_date_type() -> Object {
    Object::new("BirthDate")
        .field(Field::new("year", TypeRef::named(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let bd = ctx.parent_value.try_downcast_ref::<BirthDate>()?;
                Ok(bd.year.map(FieldValue::value))
            })
        }))
        .field(Field::new("month", TypeRef::named(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let bd = ctx.parent_value.try_downcast_ref::<BirthDate>()?;
                Ok(bd.month.map(FieldValue::value))
            })
        }))
        .field(Field::new("day", TypeRef::named(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let bd = ctx.parent_value.try_downcast_ref::<BirthDate>()?;
                Ok(bd.day.map(FieldValue::value))
            })
        }))
}

pub fn birth_date_input_type() -> InputObject {
    InputObject::new("BirthDateInput")
        .field(InputValue::new("year", TypeRef::named(TypeRef::INT)))
        .field(InputValue::new("month", TypeRef::named(TypeRef::INT)))
        .field(InputValue::new("day", TypeRef::named(TypeRef::INT)))
}

// ─── DogOutput ────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct DogOutput {
    pub id: Uuid,
    pub name: String,
    pub breed: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<BirthDate>,
    pub photo_url: Option<String>,
    pub role: Option<String>,
    pub created_at: String,
}

impl From<crate::entities::dogs::Model> for DogOutput {
    fn from(m: crate::entities::dogs::Model) -> Self {
        let birth_date = m.birth_date.as_ref().and_then(BirthDate::from_json);
        let created: chrono::DateTime<chrono::Utc> = m.created_at.into();
        Self {
            id: m.id,
            name: m.name,
            breed: m.breed,
            gender: m.gender,
            birth_date,
            photo_url: m.photo_url,
            role: None,
            created_at: created.to_rfc3339(),
        }
    }
}

pub fn dog_output_type() -> Object {
    Object::new("DogOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    Ok(Some(FieldValue::value(d.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "name",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    Ok(Some(FieldValue::value(d.name.clone())))
                })
            },
        ))
        .field(Field::new(
            "breed",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    Ok(d.breed.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "gender",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    Ok(d.gender.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "birthDate",
            TypeRef::named("BirthDate"),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    Ok(d.birth_date.clone().map(FieldValue::owned_any))
                })
            },
        ))
        .field(Field::new(
            "photoUrl",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    Ok(d.photo_url.clone().map(|key| {
                        let url = if key.starts_with("http") {
                            key
                        } else {
                            format!("{}/{}", state.config.photo_cdn_url, key)
                        };
                        FieldValue::value(url)
                    }))
                })
            },
        ))
        .field(Field::new(
            "createdAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    Ok(Some(FieldValue::value(d.created_at.clone())))
                })
            },
        ))
        .field(Field::new("role", TypeRef::named(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(d.role.clone().map(FieldValue::value))
            })
        }))
        .field(
            Field::new("walkStats", TypeRef::named("WalkStats"), |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    let dog_id = d.id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    let period = ctx
                        .args
                        .try_get("period")
                        .ok()
                        .and_then(|v| v.string().ok().map(|s| s.to_string()))
                        .unwrap_or_else(|| "ALL".to_string());
                    let stats =
                        crate::services::walk_service::get_walk_stats(&state.db, dog_id, &period)
                            .await
                            .map_err(crate::error::AppError::into_graphql_error)?;
                    Ok(Some(FieldValue::owned_any(
                        crate::graphql::custom_queries::WalkStatsOutput::from(stats),
                    )))
                })
            })
            .argument(InputValue::new("period", TypeRef::named(TypeRef::STRING))),
        )
        .field(Field::new(
            "members",
            TypeRef::named_nn_list_nn("DogMemberOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                    let dog_id = d.id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    let members = dog_member_service::get_members_by_dog(&state.db, dog_id)
                        .await
                        .map_err(AppError::into_graphql_error)?;
                    let values: Vec<FieldValue> = members
                        .into_iter()
                        .map(|(member, user)| {
                            FieldValue::owned_any(DogMemberOutput::from((member, user)))
                        })
                        .collect();
                    Ok(Some(FieldValue::list(values)))
                })
            },
        ))
}

pub fn create_dog_input_type() -> InputObject {
    InputObject::new("CreateDogInput")
        .field(InputValue::new("name", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new("breed", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("gender", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new(
            "birthDate",
            TypeRef::named("BirthDateInput"),
        ))
}

pub fn update_dog_input_type() -> InputObject {
    InputObject::new("UpdateDogInput")
        .field(InputValue::new("name", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("breed", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("gender", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new(
            "birthDate",
            TypeRef::named("BirthDateInput"),
        ))
        .field(InputValue::new("photoUrl", TypeRef::named(TypeRef::STRING)))
}

// ─── Custom output types ──────────────────────────────────────────────────────

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

/// Returned by `me` query and `updateProfile` mutation.
#[derive(Clone, Debug)]
pub struct UserOutput {
    pub id: Uuid,
    pub cognito_sub: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: String,
    pub encounter_detection_enabled: bool,
}

impl From<crate::entities::users::Model> for UserOutput {
    fn from(m: crate::entities::users::Model) -> Self {
        let created: chrono::DateTime<chrono::Utc> = m.created_at.into();
        Self {
            id: m.id,
            cognito_sub: m.cognito_sub,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
            created_at: created.to_rfc3339(),
            encounter_detection_enabled: m.encounter_detection_enabled,
        }
    }
}

/// Returned by `recordWalkEvent`.
#[derive(Clone, Debug)]
pub struct WalkEventOutput {
    pub id: Uuid,
    pub walk_id: Uuid,
    pub dog_id: Option<Uuid>,
    pub event_type: String,
    pub occurred_at: String,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    /// S3 key — converted to CloudFront URL when resolving `photoUrl` field.
    pub photo_url: Option<String>,
}

impl From<crate::entities::walk_events::Model> for WalkEventOutput {
    fn from(m: crate::entities::walk_events::Model) -> Self {
        let occurred: chrono::DateTime<chrono::Utc> = m.occurred_at.into();
        Self {
            id: m.id,
            walk_id: m.walk_id,
            dog_id: m.dog_id,
            event_type: m.event_type,
            occurred_at: occurred.to_rfc3339(),
            lat: m.lat,
            lng: m.lng,
            photo_url: m.photo_url,
        }
    }
}

/// Returned by `generateDogPhotoUploadUrl`.
#[derive(Clone, Debug)]
pub struct PresignedUrlOutput {
    pub url: String,
    pub key: String,
    pub expires_at: String,
}

/// Returned by `generateDogInvitation`.
#[derive(Clone, Debug)]
pub struct DogInvitationOutput {
    pub id: Uuid,
    pub dog_id: Uuid,
    pub token: String,
    pub expires_at: String,
}

impl From<crate::entities::dog_invitations::Model> for DogInvitationOutput {
    fn from(m: crate::entities::dog_invitations::Model) -> Self {
        let expires: chrono::DateTime<chrono::Utc> = m.expires_at.into();
        Self {
            id: m.id,
            dog_id: m.dog_id,
            token: m.token,
            expires_at: expires.to_rfc3339(),
        }
    }
}

/// Dog member with user info, used in DogOutput.members.
#[derive(Clone, Debug)]
pub struct DogMemberOutput {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: String,
}

impl
    From<(
        crate::entities::dog_members::Model,
        crate::entities::users::Model,
    )> for DogMemberOutput
{
    fn from(
        (member, user): (
            crate::entities::dog_members::Model,
            crate::entities::users::Model,
        ),
    ) -> Self {
        let created: chrono::DateTime<chrono::Utc> = member.created_at.into();
        Self {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            created_at: created.to_rfc3339(),
        }
    }
}

/// Returned by `signUp`.
#[derive(Clone, Debug)]
pub struct SignUpOutput {
    pub success: bool,
    pub user_confirmed: bool,
}

/// Returned by `signIn`.
#[derive(Clone, Debug)]
pub struct SignInOutput {
    pub access_token: String,
    pub refresh_token: String,
}

// ─── Dynamic Object type definitions ─────────────────────────────────────────

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
                        .map(|d| FieldValue::owned_any(DogOutput::from(d)))
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
                        .map(|p| FieldValue::owned_any(WalkPointOutput::from(p)))
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

                    let events =
                        crate::services::walk_event_service::list_events(&state.db, walk_id)
                            .await
                            .map_err(AppError::into_graphql_error)?;

                    let values: Vec<FieldValue> = events
                        .into_iter()
                        .map(|e| FieldValue::owned_any(WalkEventOutput::from(e)))
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

pub fn user_output_type() -> Object {
    Object::new("UserOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "cognitoSub",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.cognito_sub.clone())))
                })
            },
        ))
        .field(Field::new(
            "displayName",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(u.display_name.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "avatarUrl",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(u.avatar_url.clone().map(FieldValue::value))
                })
            },
        ))
        .field(Field::new(
            "dogs",
            TypeRef::named_nn_list_nn("DogOutput"),
            |ctx| {
                FieldFuture::new(async move {
                    use crate::entities::dog_members::{self, Entity as DogMemberEntity};
                    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    let user_id = u.id;
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    let dogs =
                        crate::services::dog_service::get_dogs_by_user_id(&state.db, user_id)
                            .await
                            .map_err(crate::error::AppError::into_graphql_error)?;

                    // Fetch memberships to get role for each dog
                    let dog_ids: Vec<Uuid> = dogs.iter().map(|d| d.id).collect();
                    let memberships = DogMemberEntity::find()
                        .filter(dog_members::Column::UserId.eq(user_id))
                        .filter(dog_members::Column::DogId.is_in(dog_ids))
                        .all(&state.db)
                        .await
                        .map_err(|e| AppError::Database(e).into_graphql_error())?;

                    let values: Vec<FieldValue> = dogs
                        .into_iter()
                        .map(|d| {
                            let role = memberships
                                .iter()
                                .find(|m| m.dog_id == d.id)
                                .map(|m| m.role.clone());
                            let mut output = DogOutput::from(d);
                            output.role = role;
                            FieldValue::owned_any(output)
                        })
                        .collect();
                    Ok(Some(FieldValue::list(values)))
                })
            },
        ))
        .field(Field::new(
            "createdAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.created_at.clone())))
                })
            },
        ))
        .field(Field::new(
            "encounterDetectionEnabled",
            TypeRef::named_nn(TypeRef::BOOLEAN),
            |ctx| {
                FieldFuture::new(async move {
                    let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                    Ok(Some(FieldValue::value(u.encounter_detection_enabled)))
                })
            },
        ))
}

pub fn walk_event_output_type() -> Object {
    Object::new("WalkEventOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                    Ok(Some(FieldValue::value(e.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "walkId",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                    Ok(Some(FieldValue::value(e.walk_id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "dogId",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                    Ok(e.dog_id.map(|id| FieldValue::value(id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "eventType",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                    Ok(Some(FieldValue::value(e.event_type.clone())))
                })
            },
        ))
        .field(Field::new(
            "occurredAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                    Ok(Some(FieldValue::value(e.occurred_at.clone())))
                })
            },
        ))
        .field(Field::new("lat", TypeRef::named(TypeRef::FLOAT), |ctx| {
            FieldFuture::new(async move {
                let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                Ok(e.lat.map(FieldValue::value))
            })
        }))
        .field(Field::new("lng", TypeRef::named(TypeRef::FLOAT), |ctx| {
            FieldFuture::new(async move {
                let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                Ok(e.lng.map(FieldValue::value))
            })
        }))
        .field(Field::new(
            "photoUrl",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    Ok(e.photo_url.clone().map(|key| {
                        let url = if key.starts_with("http") {
                            key
                        } else {
                            format!("{}/{}", state.config.photo_cdn_url, key)
                        };
                        FieldValue::value(url)
                    }))
                })
            },
        ))
}

pub fn record_walk_event_input_type() -> InputObject {
    InputObject::new("RecordWalkEventInput")
        .field(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
        .field(InputValue::new("dogId", TypeRef::named(TypeRef::ID)))
        .field(InputValue::new(
            "eventType",
            TypeRef::named_nn(TypeRef::STRING),
        ))
        .field(InputValue::new(
            "occurredAt",
            TypeRef::named_nn(TypeRef::STRING),
        ))
        .field(InputValue::new("lat", TypeRef::named(TypeRef::FLOAT)))
        .field(InputValue::new("lng", TypeRef::named(TypeRef::FLOAT)))
        .field(InputValue::new("photoKey", TypeRef::named(TypeRef::STRING)))
}

pub fn presigned_url_type() -> Object {
    Object::new("PresignedUrlOutput")
        .field(Field::new(
            "url",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                    Ok(Some(FieldValue::value(p.url.clone())))
                })
            },
        ))
        .field(Field::new(
            "key",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                    Ok(Some(FieldValue::value(p.key.clone())))
                })
            },
        ))
        .field(Field::new(
            "expiresAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                    Ok(Some(FieldValue::value(p.expires_at.clone())))
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

pub fn dog_invitation_output_type() -> Object {
    Object::new("DogInvitationOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "dogId",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.dog_id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "token",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.token.clone())))
                })
            },
        ))
        .field(Field::new(
            "expiresAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let inv = ctx.parent_value.try_downcast_ref::<DogInvitationOutput>()?;
                    Ok(Some(FieldValue::value(inv.expires_at.clone())))
                })
            },
        ))
}

pub fn dog_member_output_type() -> Object {
    Object::new("DogMemberOutput")
        .field(Field::new(
            "id",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "userId",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.user_id.to_string())))
                })
            },
        ))
        .field(Field::new(
            "role",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.role.clone())))
                })
            },
        ))
        .field(Field::new("user", TypeRef::named("WalkerOutput"), |ctx| {
            FieldFuture::new(async move {
                let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                Ok(Some(FieldValue::owned_any(WalkerOutput {
                    id: m.user_id,
                    display_name: m.display_name.clone(),
                    avatar_url: m.avatar_url.clone(),
                })))
            })
        }))
        .field(Field::new(
            "createdAt",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let m = ctx.parent_value.try_downcast_ref::<DogMemberOutput>()?;
                    Ok(Some(FieldValue::value(m.created_at.clone())))
                })
            },
        ))
}

pub fn sign_up_output_type() -> Object {
    Object::new("SignUpOutput")
        .field(Field::new(
            "success",
            TypeRef::named_nn(TypeRef::BOOLEAN),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignUpOutput>()?;
                    Ok(Some(FieldValue::value(s.success)))
                })
            },
        ))
        .field(Field::new(
            "userConfirmed",
            TypeRef::named_nn(TypeRef::BOOLEAN),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignUpOutput>()?;
                    Ok(Some(FieldValue::value(s.user_confirmed)))
                })
            },
        ))
}

pub fn sign_in_output_type() -> Object {
    Object::new("SignInOutput")
        .field(Field::new(
            "accessToken",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignInOutput>()?;
                    Ok(Some(FieldValue::value(s.access_token.clone())))
                })
            },
        ))
        .field(Field::new(
            "refreshToken",
            TypeRef::named_nn(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let s = ctx.parent_value.try_downcast_ref::<SignInOutput>()?;
                    Ok(Some(FieldValue::value(s.refresh_token.clone())))
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

pub fn update_profile_input_type() -> InputObject {
    InputObject::new("UpdateProfileInput").field(InputValue::new(
        "displayName",
        TypeRef::named(TypeRef::STRING),
    ))
}

pub fn sign_up_input_type() -> InputObject {
    InputObject::new("SignUpInput")
        .field(InputValue::new("email", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new(
            "password",
            TypeRef::named_nn(TypeRef::STRING),
        ))
        .field(InputValue::new(
            "displayName",
            TypeRef::named_nn(TypeRef::STRING),
        ))
}

pub fn confirm_sign_up_input_type() -> InputObject {
    InputObject::new("ConfirmSignUpInput")
        .field(InputValue::new("email", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new("code", TypeRef::named_nn(TypeRef::STRING)))
}

pub fn sign_in_input_type() -> InputObject {
    InputObject::new("SignInInput")
        .field(InputValue::new("email", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new(
            "password",
            TypeRef::named_nn(TypeRef::STRING),
        ))
}

pub fn refresh_token_input_type() -> InputObject {
    InputObject::new("RefreshTokenInput").field(InputValue::new(
        "refreshToken",
        TypeRef::named_nn(TypeRef::STRING),
    ))
}

// ─── Mutation fields ──────────────────────────────────────────────────────────

pub fn mutation_fields(state: Arc<AppState>) -> Vec<Field> {
    vec![
        sign_up_field(state.clone()),
        confirm_sign_up_field(state.clone()),
        sign_in_field(state.clone()),
        sign_out_field(state.clone()),
        refresh_token_field(state.clone()),
        create_dog_field(state.clone()),
        update_dog_field(state.clone()),
        delete_dog_field(state.clone()),
        generate_dog_photo_upload_url_field(state.clone()),
        start_walk_field(state.clone()),
        finish_walk_field(state.clone()),
        add_walk_points_field(state.clone()),
        update_profile_field(state.clone()),
        generate_dog_invitation_field(state.clone()),
        accept_dog_invitation_field(state.clone()),
        remove_dog_member_field(state.clone()),
        leave_dog_field(state.clone()),
        record_encounter_field(state.clone()),
        update_encounter_duration_field(state.clone()),
        update_encounter_detection_field(state.clone()),
        record_walk_event_field(state.clone()),
        generate_walk_event_photo_upload_url_field(state),
    ]
}

fn sign_up_field(state: Arc<AppState>) -> Field {
    Field::new("signUp", TypeRef::named_nn("SignUpOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let input = ctx.args.try_get("input")?.object()?;
            let email = input.try_get("email")?.string()?.to_string();
            let password = input.try_get("password")?.string()?.to_string();
            let display_name = input.try_get("displayName")?.string()?.to_string();

            let result = auth::service::sign_up(
                &state.cognito,
                &state.config.cognito_client_id,
                &email,
                &password,
                &display_name,
            )
            .await
            .map_err(AppError::into_graphql_error)?;

            // display_name 付きで DB ユーザーレコードを即時作成する。
            if !result.user_sub.is_empty() {
                user_service::create_user_with_profile(&state.db, &result.user_sub, &display_name)
                    .await
                    .map_err(AppError::into_graphql_error)?;
            }

            Ok(Some(FieldValue::owned_any(SignUpOutput {
                success: true,
                user_confirmed: result.user_confirmed,
            })))
        })
    })
    .argument(InputValue::new("input", TypeRef::named_nn("SignUpInput")))
}

fn confirm_sign_up_field(state: Arc<AppState>) -> Field {
    Field::new(
        "confirmSignUp",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let input = ctx.args.try_get("input")?.object()?;
                let email = input.try_get("email")?.string()?.to_string();
                let code = input.try_get("code")?.string()?.to_string();

                auth::service::confirm_sign_up(
                    &state.cognito,
                    &state.config.cognito_client_id,
                    &email,
                    &code,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::value(true)))
            })
        },
    )
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("ConfirmSignUpInput"),
    ))
}

fn sign_in_field(state: Arc<AppState>) -> Field {
    Field::new("signIn", TypeRef::named_nn("SignInOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let input = ctx.args.try_get("input")?.object()?;
            let email = input.try_get("email")?.string()?.to_string();
            let password = input.try_get("password")?.string()?.to_string();

            let result = auth::service::sign_in(
                &state.cognito,
                &state.config.cognito_client_id,
                &email,
                &password,
            )
            .await
            .map_err(AppError::into_graphql_error)?;

            Ok(Some(FieldValue::owned_any(SignInOutput {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
            })))
        })
    })
    .argument(InputValue::new("input", TypeRef::named_nn("SignInInput")))
}

fn sign_out_field(state: Arc<AppState>) -> Field {
    Field::new("signOut", TypeRef::named_nn(TypeRef::BOOLEAN), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let access_token = ctx.args.try_get("accessToken")?.string()?.to_string();

            auth::service::sign_out(&state.cognito, &access_token)
                .await
                .map_err(AppError::into_graphql_error)?;

            Ok(Some(FieldValue::value(true)))
        })
    })
    .argument(InputValue::new(
        "accessToken",
        TypeRef::named_nn(TypeRef::STRING),
    ))
}

fn refresh_token_field(state: Arc<AppState>) -> Field {
    Field::new(
        "refreshToken",
        TypeRef::named_nn("SignInOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let input = ctx.args.try_get("input")?.object()?;
                let refresh_token = input.try_get("refreshToken")?.string()?.to_string();

                let result = auth::service::refresh_token(
                    &state.cognito,
                    &state.config.cognito_client_id,
                    &refresh_token,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::owned_any(SignInOutput {
                    access_token: result.access_token,
                    refresh_token: result.refresh_token,
                })))
            })
        },
    )
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("RefreshTokenInput"),
    ))
}

fn create_dog_field(state: Arc<AppState>) -> Field {
    Field::new("createDog", TypeRef::named_nn("DogOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let input = ctx.args.try_get("input")?.object()?;
            let name = input.try_get("name")?.string()?.to_string();
            let breed = input
                .get("breed")
                .map(|v| v.string().map(|s| s.to_string()))
                .transpose()?;
            let gender = input
                .get("gender")
                .map(|v| v.string().map(|s| s.to_string()))
                .transpose()?;
            let birth_date = parse_birth_date_input(input.get("birthDate"))?;

            let user = auth_helpers::resolve_user(&ctx, &state).await?;
            let dog = dog_service::create_dog(&state.db, user.id, name, breed, gender, birth_date)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
        })
    })
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("CreateDogInput"),
    ))
}

fn update_dog_field(state: Arc<AppState>) -> Field {
    Field::new("updateDog", TypeRef::named_nn("DogOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let id_str = ctx.args.try_get("id")?.string()?;
            let dog_id =
                Uuid::parse_str(id_str).map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
            let input = ctx.args.try_get("input")?.object()?;
            let name = input
                .get("name")
                .map(|v| v.string().map(|s| s.to_string()))
                .transpose()?;
            let breed = input
                .get("breed")
                .map(|v| v.string().map(|s| s.to_string()))
                .transpose()?;
            let gender = input
                .get("gender")
                .map(|v| v.string().map(|s| s.to_string()))
                .transpose()?;
            let birth_date = parse_birth_date_input(input.get("birthDate"))?;
            let photo_url = input
                .get("photoUrl")
                .map(|v| v.string().map(|s| s.to_string()))
                .transpose()?;

            auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;
            let dog = dog_service::update_dog(
                &state.db, dog_id, name, breed, gender, birth_date, photo_url,
            )
            .await
            .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
        })
    })
    .argument(InputValue::new("id", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("UpdateDogInput"),
    ))
}

fn start_walk_field(state: Arc<AppState>) -> Field {
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

fn finish_walk_field(state: Arc<AppState>) -> Field {
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

fn add_walk_points_field(state: Arc<AppState>) -> Field {
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

fn update_profile_field(state: Arc<AppState>) -> Field {
    Field::new(
        "updateProfile",
        TypeRef::named_nn("UserOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let cognito_sub = auth::require_auth(&ctx)?;
                let input = ctx.args.try_get("input")?.object()?;
                let display_name = input
                    .get("displayName")
                    .map(|v| v.string().map(|s| s.to_string()))
                    .transpose()?;

                let user = user_service::update_profile(&state.db, &cognito_sub, display_name)
                    .await
                    .map_err(AppError::into_graphql_error)?;
                Ok(Some(FieldValue::owned_any(UserOutput::from(user))))
            })
        },
    )
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("UpdateProfileInput"),
    ))
}

fn delete_dog_field(state: Arc<AppState>) -> Field {
    Field::new(
        "deleteDog",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("id")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;
                dog_member_service::require_dog_owner(&state.db, dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;
                let result = dog_service::delete_dog(&state.db, dog_id)
                    .await
                    .map_err(AppError::into_graphql_error)?;
                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("id", TypeRef::named_nn(TypeRef::ID)))
}

fn generate_dog_photo_upload_url_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateDogPhotoUploadUrl",
        TypeRef::named_nn("PresignedUrlOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
                let content_type = ctx.args.try_get("contentType")?.string()?.to_string();

                auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

                let presigned = s3_service::generate_dog_photo_upload_url(
                    &state.s3,
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

fn generate_dog_invitation_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateDogInvitation",
        TypeRef::named_nn("DogInvitationOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;
                dog_member_service::require_dog_owner(&state.db, dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                let invitation =
                    dog_invitation_service::create_invitation(&state.db, dog_id, user.id)
                        .await
                        .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::owned_any(DogInvitationOutput::from(
                    invitation,
                ))))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
}

fn accept_dog_invitation_field(state: Arc<AppState>) -> Field {
    Field::new(
        "acceptDogInvitation",
        TypeRef::named_nn("DogOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let token = ctx.args.try_get("token")?.string()?.to_string();

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                let member = dog_invitation_service::accept_invitation(&state.db, &token, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                let dog = dog_service::get_dog_by_id(&state.db, member.dog_id)
                    .await
                    .map_err(AppError::into_graphql_error)?
                    .ok_or_else(|| async_graphql::Error::new("Dog not found"))?;

                Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
            })
        },
    )
    .argument(InputValue::new("token", TypeRef::named_nn(TypeRef::STRING)))
}

fn remove_dog_member_field(state: Arc<AppState>) -> Field {
    Field::new(
        "removeDogMember",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
                let target_user_id_str = ctx.args.try_get("userId")?.string()?;
                let target_user_id = Uuid::parse_str(target_user_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid user ID"))?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                // Only the owner can remove members
                dog_member_service::require_dog_owner(&state.db, dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                // Cannot remove yourself (owner) via this mutation
                if target_user_id == user.id {
                    return Err(async_graphql::Error::new(
                        "Cannot remove yourself. Use leaveDog instead.",
                    ));
                }

                let result = dog_member_service::remove_member(&state.db, dog_id, target_user_id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("userId", TypeRef::named_nn(TypeRef::ID)))
}

fn leave_dog_field(state: Arc<AppState>) -> Field {
    Field::new(
        "leaveDog",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

                let (user, membership) =
                    auth_helpers::resolve_user_and_dog(&ctx, &state, dog_id).await?;

                // Owners cannot leave their own dog
                if membership.role == "owner" {
                    return Err(async_graphql::Error::new(
                        "Owners cannot leave their dog. Transfer ownership or delete the dog.",
                    ));
                }

                let result = dog_member_service::remove_member(&state.db, dog_id, user.id)
                    .await
                    .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("dogId", TypeRef::named_nn(TypeRef::ID)))
}

fn record_encounter_field(state: Arc<AppState>) -> Field {
    Field::new(
        "recordEncounter",
        TypeRef::named_nn_list_nn("EncounterOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                // Input parse — accumulate all field errors before returning
                let my_walk_id_str = ctx.args.try_get("myWalkId")?.string()?;
                let their_walk_id_str = ctx.args.try_get("theirWalkId")?.string()?;

                let mut field_errors: Vec<FieldError> = Vec::new();

                let my_walk_id = Uuid::parse_str(my_walk_id_str).ok().or_else(|| {
                    field_errors.push(FieldError {
                        field: "myWalkId".to_string(),
                        message: "Invalid UUID format".to_string(),
                    });
                    None
                });
                let their_walk_id = Uuid::parse_str(their_walk_id_str).ok().or_else(|| {
                    field_errors.push(FieldError {
                        field: "theirWalkId".to_string(),
                        message: "Invalid UUID format".to_string(),
                    });
                    None
                });

                if !field_errors.is_empty() {
                    return Err(AppError::ValidationErrors(field_errors).into_graphql_error());
                }

                // Both values are Some since field_errors is empty
                let my_walk_id = my_walk_id.unwrap();
                let their_walk_id = their_walk_id.unwrap();

                // Auth
                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                // Service call — authorization + counterparty opt-out check delegated to service
                let encounters = encounter_service::record_encounter(
                    &state.db,
                    my_walk_id,
                    their_walk_id,
                    30,
                    user.id,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                // Output
                let values: Vec<FieldValue> = encounters
                    .into_iter()
                    .map(|e| FieldValue::owned_any(EncounterOutput::from(e)))
                    .collect();
                Ok(Some(FieldValue::list(values)))
            })
        },
    )
    .argument(InputValue::new("myWalkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "theirWalkId",
        TypeRef::named_nn(TypeRef::ID),
    ))
}

fn update_encounter_duration_field(state: Arc<AppState>) -> Field {
    Field::new(
        "updateEncounterDuration",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                // Input parse
                let my_walk_id_str = ctx.args.try_get("myWalkId")?.string()?;
                let their_walk_id_str = ctx.args.try_get("theirWalkId")?.string()?;
                let duration_sec = ctx.args.try_get("durationSec")?.i64()? as i32;
                let my_walk_id = Uuid::parse_str(my_walk_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid myWalkId"))?;
                let their_walk_id = Uuid::parse_str(their_walk_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid theirWalkId"))?;

                // Auth
                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                // Service call (authorization delegated to service)
                let result = encounter_service::update_encounter_duration(
                    &state.db,
                    my_walk_id,
                    their_walk_id,
                    duration_sec,
                    user.id,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                // Output
                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("myWalkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "theirWalkId",
        TypeRef::named_nn(TypeRef::ID),
    ))
    .argument(InputValue::new(
        "durationSec",
        TypeRef::named_nn(TypeRef::INT),
    ))
}

fn update_encounter_detection_field(state: Arc<AppState>) -> Field {
    Field::new(
        "updateEncounterDetection",
        TypeRef::named_nn("UserOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                use crate::entities::users;
                use sea_orm::{ActiveModelTrait, Set};

                let enabled = ctx.args.try_get("enabled")?.boolean()?;

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                let mut active: users::ActiveModel = user.into();
                active.encounter_detection_enabled = Set(enabled);
                let updated = active
                    .update(&state.db)
                    .await
                    .map_err(|e| AppError::Database(e).into_graphql_error())?;

                Ok(Some(FieldValue::owned_any(UserOutput::from(updated))))
            })
        },
    )
    .argument(InputValue::new(
        "enabled",
        TypeRef::named_nn(TypeRef::BOOLEAN),
    ))
}

fn record_walk_event_field(state: Arc<AppState>) -> Field {
    Field::new(
        "recordWalkEvent",
        TypeRef::named_nn("WalkEventOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let input = ctx.args.try_get("input")?.object()?;

                let walk_id_str = input.try_get("walkId")?.string()?;
                let walk_id = Uuid::parse_str(walk_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid walkId"))?;

                let dog_id = input
                    .get("dogId")
                    .and_then(|v| v.string().ok())
                    .map(Uuid::parse_str)
                    .transpose()
                    .map_err(|_| async_graphql::Error::new("Invalid dogId"))?;

                let event_type = input.try_get("eventType")?.string()?.to_string();
                let occurred_at_str = input.try_get("occurredAt")?.string()?;
                let occurred_at: chrono::DateTime<chrono::FixedOffset> =
                    chrono::DateTime::parse_from_rfc3339(occurred_at_str).map_err(|_| {
                        async_graphql::Error::new("Invalid occurredAt: must be RFC3339")
                    })?;

                let lat = input.get("lat").and_then(|v| v.f64().ok());
                let lng = input.get("lng").and_then(|v| v.f64().ok());
                let photo_key = input
                    .get("photoKey")
                    .and_then(|v| v.string().ok())
                    .map(|s| s.to_string());

                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                let service_input = walk_event_service::RecordEventInput {
                    dog_id,
                    event_type,
                    occurred_at,
                    lat,
                    lng,
                    photo_key,
                };

                let event =
                    walk_event_service::record_event(&state.db, walk_id, user.id, service_input)
                        .await
                        .map_err(AppError::into_graphql_error)?;

                Ok(Some(FieldValue::owned_any(WalkEventOutput::from(event))))
            })
        },
    )
    .argument(InputValue::new(
        "input",
        TypeRef::named_nn("RecordWalkEventInput"),
    ))
}

fn generate_walk_event_photo_upload_url_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateWalkEventPhotoUploadUrl",
        TypeRef::named_nn("PresignedUrlOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let walk_id_str = ctx.args.try_get("walkId")?.string()?;
                let walk_id = Uuid::parse_str(walk_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;
                let content_type = ctx.args.try_get("contentType")?.string()?.to_string();

                auth_helpers::resolve_user_and_walk(&ctx, &state, walk_id).await?;

                let presigned = s3_service::generate_walk_event_photo_upload_url(
                    &state.s3,
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
