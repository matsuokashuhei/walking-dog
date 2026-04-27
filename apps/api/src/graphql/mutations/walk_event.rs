use crate::error::AppError;
use crate::graphql::auth_helpers;
use crate::graphql::dynamic_helpers::{
    format_photo_cdn_url, optional_float_field, optional_string_field, parse_uuid, string_field,
    uuid_field,
};
use crate::services::walk_event_service;
use crate::AppState;
use async_graphql::dynamic::{
    Field, FieldFuture, FieldValue, InputObject, InputValue, Object, TypeRef,
};
use std::sync::Arc;
use uuid::Uuid;

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

pub fn walk_event_output_type() -> Object {
    Object::new("WalkEventOutput")
        .field(uuid_field("id", |e: &WalkEventOutput| e.id))
        .field(uuid_field("walkId", |e: &WalkEventOutput| e.walk_id))
        .field(optional_string_field("dogId", |e: &WalkEventOutput| {
            e.dog_id.map(|id| id.to_string())
        }))
        .field(string_field("eventType", |e: &WalkEventOutput| {
            e.event_type.clone()
        }))
        .field(string_field("occurredAt", |e: &WalkEventOutput| {
            e.occurred_at.clone()
        }))
        .field(optional_float_field("lat", |e: &WalkEventOutput| e.lat))
        .field(optional_float_field("lng", |e: &WalkEventOutput| e.lng))
        .field(Field::new(
            "photoUrl",
            TypeRef::named(TypeRef::STRING),
            |ctx| {
                FieldFuture::new(async move {
                    let e = ctx.parent_value.try_downcast_ref::<WalkEventOutput>()?;
                    let state = ctx.data::<Arc<crate::AppState>>()?;
                    Ok(e.photo_url.clone().map(|key| {
                        FieldValue::value(format_photo_cdn_url(&state.config.photo_cdn_url, &key))
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

pub fn record_walk_event_field(state: Arc<AppState>) -> Field {
    Field::new(
        "recordWalkEvent",
        TypeRef::named_nn("WalkEventOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                let input = ctx.args.try_get("input")?.object()?;

                let walk_id_str = input.try_get("walkId")?.string()?;
                let walk_id = parse_uuid(walk_id_str, "Invalid walkId")?;

                let dog_id = input
                    .get("dogId")
                    .and_then(|v| v.string().ok())
                    .map(|value| parse_uuid(value, "Invalid dogId"))
                    .transpose()?;

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
