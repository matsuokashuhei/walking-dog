use async_graphql::dynamic::{Field, FieldFuture, FieldValue, InputObject, InputValue, Object, TypeRef};
use std::sync::Arc;
use uuid::Uuid;
use crate::AppState;
use crate::error::AppError;
use crate::services::{dog_service, s3_service, user_service, walk_points_service, walk_service};

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
        if let Some(y) = year { map.insert("year".into(), y.into()); }
        if let Some(m) = month { map.insert("month".into(), m.into()); }
        if let Some(d) = day { map.insert("day".into(), d.into()); }
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
    pub user_id: Uuid,
    pub name: String,
    pub breed: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<BirthDate>,
    pub photo_url: Option<String>,
    pub created_at: String,
}

impl From<crate::entities::dogs::Model> for DogOutput {
    fn from(m: crate::entities::dogs::Model) -> Self {
        let birth_date = m.birth_date.as_ref().and_then(BirthDate::from_json);
        let created: chrono::DateTime<chrono::Utc> = m.created_at.into();
        Self {
            id: m.id,
            user_id: m.user_id,
            name: m.name,
            breed: m.breed,
            gender: m.gender,
            birth_date,
            photo_url: m.photo_url,
            created_at: created.to_rfc3339(),
        }
    }
}

pub fn dog_output_type() -> Object {
    Object::new("DogOutput")
        .field(Field::new("id", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(Some(FieldValue::value(d.id.to_string())))
            })
        }))
        .field(Field::new("name", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(Some(FieldValue::value(d.name.clone())))
            })
        }))
        .field(Field::new("breed", TypeRef::named(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(d.breed.clone().map(FieldValue::value))
            })
        }))
        .field(Field::new("gender", TypeRef::named(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(d.gender.clone().map(FieldValue::value))
            })
        }))
        .field(Field::new("birthDate", TypeRef::named("BirthDate"), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(d.birth_date.clone().map(FieldValue::owned_any))
            })
        }))
        .field(Field::new("photoUrl", TypeRef::named(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(d.photo_url.clone().map(FieldValue::value))
            })
        }))
        .field(Field::new("createdAt", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let d = ctx.parent_value.try_downcast_ref::<DogOutput>()?;
                Ok(Some(FieldValue::value(d.created_at.clone())))
            })
        }))
}

pub fn create_dog_input_type() -> InputObject {
    InputObject::new("CreateDogInput")
        .field(InputValue::new("name", TypeRef::named_nn(TypeRef::STRING)))
        .field(InputValue::new("breed", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("gender", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("birthDate", TypeRef::named("BirthDateInput")))
}

pub fn update_dog_input_type() -> InputObject {
    InputObject::new("UpdateDogInput")
        .field(InputValue::new("name", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("breed", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("gender", TypeRef::named(TypeRef::STRING)))
        .field(InputValue::new("birthDate", TypeRef::named("BirthDateInput")))
}

// ─── Custom output types ──────────────────────────────────────────────────────

/// Returned by `startWalk` and `finishWalk`.
#[derive(Clone, Debug)]
pub struct WalkOutput {
    pub id: Uuid,
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
            status: m.status,
            distance_m: m.distance_m,
            duration_sec: m.duration_sec,
            started_at: started.to_rfc3339(),
            ended_at: ended.map(|t| t.to_rfc3339()),
        }
    }
}

/// Returned by `me` query and `updateProfile` mutation.
#[derive(Clone, Debug)]
pub struct UserOutput {
    pub id: Uuid,
    pub cognito_sub: String,
    pub display_name: Option<String>,
    pub created_at: String,
}

impl From<crate::entities::users::Model> for UserOutput {
    fn from(m: crate::entities::users::Model) -> Self {
        let created: chrono::DateTime<chrono::Utc> = m.created_at.into();
        Self {
            id: m.id,
            cognito_sub: m.cognito_sub,
            display_name: m.display_name,
            created_at: created.to_rfc3339(),
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

// ─── Dynamic Object type definitions ─────────────────────────────────────────

pub fn walk_output_type() -> Object {
    Object::new("WalkOutput")
        .field(Field::new("id", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                Ok(Some(FieldValue::value(w.id.to_string())))
            })
        }))
        .field(Field::new("status", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                Ok(Some(FieldValue::value(w.status.clone())))
            })
        }))
        .field(Field::new("distanceM", TypeRef::named(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                Ok(w.distance_m.map(|v| FieldValue::value(v)))
            })
        }))
        .field(Field::new("durationSec", TypeRef::named(TypeRef::INT), |ctx| {
            FieldFuture::new(async move {
                let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                Ok(w.duration_sec.map(|v| FieldValue::value(v)))
            })
        }))
        .field(Field::new("startedAt", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                Ok(Some(FieldValue::value(w.started_at.clone())))
            })
        }))
        .field(Field::new("endedAt", TypeRef::named(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let w = ctx.parent_value.try_downcast_ref::<WalkOutput>()?;
                Ok(w.ended_at.clone().map(FieldValue::value))
            })
        }))
}

pub fn user_output_type() -> Object {
    Object::new("UserOutput")
        .field(Field::new("id", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                Ok(Some(FieldValue::value(u.id.to_string())))
            })
        }))
        .field(Field::new("cognitoSub", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                Ok(Some(FieldValue::value(u.cognito_sub.clone())))
            })
        }))
        .field(Field::new("displayName", TypeRef::named(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                Ok(u.display_name.clone().map(FieldValue::value))
            })
        }))
        .field(Field::new("createdAt", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let u = ctx.parent_value.try_downcast_ref::<UserOutput>()?;
                Ok(Some(FieldValue::value(u.created_at.clone())))
            })
        }))
}

pub fn presigned_url_type() -> Object {
    Object::new("PresignedUrlOutput")
        .field(Field::new("url", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                Ok(Some(FieldValue::value(p.url.clone())))
            })
        }))
        .field(Field::new("key", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                Ok(Some(FieldValue::value(p.key.clone())))
            })
        }))
        .field(Field::new("expiresAt", TypeRef::named_nn(TypeRef::STRING), |ctx| {
            FieldFuture::new(async move {
                let p = ctx.parent_value.try_downcast_ref::<PresignedUrlOutput>()?;
                Ok(Some(FieldValue::value(p.expires_at.clone())))
            })
        }))
}

pub fn walk_point_input_type() -> InputObject {
    InputObject::new("WalkPointInput")
        .field(InputValue::new("lat", TypeRef::named_nn(TypeRef::FLOAT)))
        .field(InputValue::new("lng", TypeRef::named_nn(TypeRef::FLOAT)))
        .field(InputValue::new("recordedAt", TypeRef::named_nn(TypeRef::STRING)))
}

pub fn update_profile_input_type() -> InputObject {
    InputObject::new("UpdateProfileInput")
        .field(InputValue::new("displayName", TypeRef::named(TypeRef::STRING)))
}

// ─── Mutation fields ──────────────────────────────────────────────────────────

pub fn mutation_fields(state: Arc<AppState>) -> Vec<Field> {
    vec![
        create_dog_field(state.clone()),
        update_dog_field(state.clone()),
        delete_dog_field(state.clone()),
        generate_dog_photo_upload_url_field(state.clone()),
        start_walk_field(state.clone()),
        finish_walk_field(state.clone()),
        add_walk_points_field(state.clone()),
        update_profile_field(state),
    ]
}

fn create_dog_field(state: Arc<AppState>) -> Field {
    Field::new("createDog", TypeRef::named_nn("DogOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let input = ctx.args.try_get("input")?.object()?;
            let name = input.try_get("name")?.string()?.to_string();
            let breed = input.get("breed").map(|v| v.string().map(|s| s.to_string())).transpose()?;
            let gender = input.get("gender").map(|v| v.string().map(|s| s.to_string())).transpose()?;
            let birth_date = input.get("birthDate").map(|v| {
                let obj = v.object()?;
                let year = obj.get("year").map(|v| v.i64().map(|n| n as i32)).transpose()?;
                let month = obj.get("month").map(|v| v.i64().map(|n| n as i32)).transpose()?;
                let day = obj.get("day").map(|v| v.i64().map(|n| n as i32)).transpose()?;
                Ok::<_, async_graphql::Error>(BirthDate::to_json(year, month, day))
            }).transpose()?;

            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
            let dog = dog_service::create_dog(&state.db, user.id, name, breed, gender, birth_date)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
        })
    })
    .argument(InputValue::new("input", TypeRef::named_nn("CreateDogInput")))
}

fn update_dog_field(state: Arc<AppState>) -> Field {
    Field::new("updateDog", TypeRef::named_nn("DogOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let id_str = ctx.args.try_get("id")?.string()?;
            let dog_id = Uuid::parse_str(id_str)
                .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
            let input = ctx.args.try_get("input")?.object()?;
            let name = input.get("name").map(|v| v.string().map(|s| s.to_string())).transpose()?;
            let breed = input.get("breed").map(|v| v.string().map(|s| s.to_string())).transpose()?;
            let gender = input.get("gender").map(|v| v.string().map(|s| s.to_string())).transpose()?;
            let birth_date = input.get("birthDate").map(|v| {
                let obj = v.object()?;
                let year = obj.get("year").map(|v| v.i64().map(|n| n as i32)).transpose()?;
                let month = obj.get("month").map(|v| v.i64().map(|n| n as i32)).transpose()?;
                let day = obj.get("day").map(|v| v.i64().map(|n| n as i32)).transpose()?;
                Ok::<_, async_graphql::Error>(BirthDate::to_json(year, month, day))
            }).transpose()?;

            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
            let dog = dog_service::update_dog(&state.db, dog_id, user.id, name, breed, gender, birth_date)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(DogOutput::from(dog))))
        })
    })
    .argument(InputValue::new("id", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("input", TypeRef::named_nn("UpdateDogInput")))
}

fn start_walk_field(state: Arc<AppState>) -> Field {
    Field::new("startWalk", TypeRef::named_nn("WalkOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let dog_ids_raw = ctx.args.try_get("dogIds")?;
            let dog_ids = dog_ids_raw
                .list()?
                .iter()
                .map(|v| {
                    let s = v.string()?;
                    Uuid::parse_str(s).map_err(|_| async_graphql::Error::new("Invalid dog ID"))
                })
                .collect::<Result<Vec<Uuid>, _>>()?;

            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
            let walk = walk_service::start_walk(&state.db, user.id, dog_ids)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(WalkOutput::from(walk))))
        })
    })
    .argument(InputValue::new("dogIds", TypeRef::named_nn_list_nn(TypeRef::ID)))
}

fn finish_walk_field(state: Arc<AppState>) -> Field {
    Field::new("finishWalk", TypeRef::named_nn("WalkOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let walk_id_str = ctx.args.try_get("walkId")?.string()?;
            let walk_id = Uuid::parse_str(walk_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;

            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
            let walk = walk_service::finish_walk(&state.db, walk_id, user.id)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(WalkOutput::from(walk))))
        })
    })
    .argument(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
}

fn add_walk_points_field(state: Arc<AppState>) -> Field {
    Field::new("addWalkPoints", TypeRef::named_nn(TypeRef::BOOLEAN), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            use crate::entities::{walks, walks::Entity as WalkEntity};
            use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};

            let cognito_sub = ctx.data::<String>()?;
            let walk_id_str = ctx.args.try_get("walkId")?.string()?;
            let walk_id = Uuid::parse_str(walk_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid walk ID"))?;

            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
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
                    Ok(walk_points_service::WalkPointInput { lat, lng, recorded_at })
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
    })
    .argument(InputValue::new("walkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new("points", TypeRef::named_nn_list_nn("WalkPointInput")))
}

fn update_profile_field(state: Arc<AppState>) -> Field {
    Field::new("updateProfile", TypeRef::named_nn("UserOutput"), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let input = ctx.args.try_get("input")?.object()?;
            let display_name = input
                .get("displayName")
                .map(|v| v.string().map(|s| s.to_string()))
                .transpose()?;

            let user = user_service::update_profile(&state.db, cognito_sub, display_name)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::owned_any(UserOutput::from(user))))
        })
    })
    .argument(InputValue::new("input", TypeRef::named_nn("UpdateProfileInput")))
}

fn delete_dog_field(state: Arc<AppState>) -> Field {
    Field::new("deleteDog", TypeRef::named_nn(TypeRef::BOOLEAN), move |ctx| {
        let state = state.clone();
        FieldFuture::new(async move {
            let cognito_sub = ctx.data::<String>()?;
            let dog_id_str = ctx.args.try_get("id")?.string()?;
            let dog_id = Uuid::parse_str(dog_id_str)
                .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

            let user = user_service::get_or_create_user(&state.db, cognito_sub)
                .await
                .map_err(AppError::into_graphql_error)?;
            let result = dog_service::delete_dog(&state.db, dog_id, user.id)
                .await
                .map_err(AppError::into_graphql_error)?;
            Ok(Some(FieldValue::value(result)))
        })
    })
    .argument(InputValue::new("id", TypeRef::named_nn(TypeRef::ID)))
}

fn generate_dog_photo_upload_url_field(state: Arc<AppState>) -> Field {
    Field::new(
        "generateDogPhotoUploadUrl",
        TypeRef::named_nn("PresignedUrlOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                use crate::entities::{dogs, dogs::Entity as DogEntity};
                use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};

                let cognito_sub = ctx.data::<String>()?;
                let dog_id_str = ctx.args.try_get("dogId")?.string()?;
                let dog_id = Uuid::parse_str(dog_id_str)
                    .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;

                let user = user_service::get_or_create_user(&state.db, cognito_sub)
                    .await
                    .map_err(AppError::into_graphql_error)?;
                DogEntity::find_by_id(dog_id)
                    .filter(dogs::Column::UserId.eq(user.id))
                    .one(&state.db)
                    .await
                    .map_err(|e| AppError::Database(e).into_graphql_error())?
                    .ok_or_else(|| async_graphql::Error::new("Dog not found"))?;

                let presigned = s3_service::generate_dog_photo_upload_url(
                    &state.s3,
                    &state.config.s3_bucket_dog_photos,
                    dog_id,
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
}
