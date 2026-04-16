use crate::error::AppError;
use crate::graphql::auth_helpers;
use crate::graphql::input::birth_date::parse_birth_date_input;
use crate::services::{dog_member_service, dog_service};
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
                            FieldValue::owned_any(
                                super::dog_member::DogMemberOutput::from((member, user)),
                            )
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

pub fn create_dog_field(state: Arc<AppState>) -> Field {
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

pub fn update_dog_field(state: Arc<AppState>) -> Field {
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

pub fn delete_dog_field(state: Arc<AppState>) -> Field {
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
