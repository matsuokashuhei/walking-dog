use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use uuid::Uuid;

use crate::entity::{user, walk, walk_dog, walk_dog_event};
use crate::graphql::{
    error::AppError,
    guard::AuthGuard,
    object::{
        coordinate::{Latitude, Longitude},
        walk_dog_event::{EventType, WalkDogEvent},
    },
};

#[derive(Default, Debug)]
pub struct WalkDogEventMutation;

async fn add_event_for_user(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    input: AddEventInput,
) -> Result<walk_dog_event::Model> {
    let Some(walk) = walk::Entity::find_by_id(input.walk_id)
        .filter(walk::Column::UserId.eq(user_id))
        .one(db)
        .await?
    else {
        return Err(AppError::NotFound.into());
    };

    if walk.ended_at.is_some() {
        return Err(
            AppError::UnprocessableEntity("Cannot add event to an ended walk".to_string()).into(),
        );
    }

    let started_at: chrono::DateTime<chrono::Utc> = walk.started_at.into();
    if input.occurred_at < started_at {
        return Err(AppError::UnprocessableEntity(
            "Event occurred_at must be after walk started_at".to_string(),
        )
        .into());
    }

    let Some(walk_dog) = walk_dog::Entity::find()
        .filter(walk_dog::Column::WalkId.eq(input.walk_id))
        .filter(walk_dog::Column::DogId.eq(input.dog_id))
        .one(db)
        .await?
    else {
        return Err(AppError::NotFound.into());
    };

    if let Some(client_request_id) = input.client_request_id {
        if let Some(existing_event) = walk_dog_event::Entity::find()
            .filter(walk_dog_event::Column::ClientRequestId.eq(client_request_id))
            .one(db)
            .await?
        {
            if is_same_event(&existing_event, &walk_dog, &input) {
                return Ok(existing_event);
            }

            return Err(AppError::UnprocessableEntity(
                "clientRequestId has already been used for a different event".to_string(),
            )
            .into());
        }
    }

    let event = walk_dog_event::ActiveModel {
        walk_dog_id: Set(walk_dog.id),
        event: Set(input.event.into()),
        occurred_at: Set(input.occurred_at.into()),
        latitude: Set(input.latitude.value()),
        longitude: Set(input.longitude.value()),
        client_request_id: Set(input.client_request_id),
        ..Default::default()
    }
    .insert(db)
    .await?;

    Ok(event)
}

fn is_same_event(
    event: &walk_dog_event::Model,
    walk_dog: &walk_dog::Model,
    input: &AddEventInput,
) -> bool {
    let occurred_at: sea_orm::prelude::DateTimeWithTimeZone = input.occurred_at.into();
    event.walk_dog_id == walk_dog.id
        && event.event == input.event.into()
        && event.occurred_at == occurred_at
        && event.latitude == input.latitude.value()
        && event.longitude == input.longitude.value()
}

#[Object]
impl WalkDogEventMutation {
    #[graphql(guard = "AuthGuard")]
    async fn add_event(&self, ctx: &Context<'_>, input: AddEventInput) -> Result<WalkDogEvent> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        Ok(WalkDogEvent::from(
            add_event_for_user(db, user.id, input).await?,
        ))
    }
}

#[derive(Clone, Debug, InputObject)]
struct AddEventInput {
    walk_id: Uuid,
    dog_id: Uuid,
    event: EventType,
    occurred_at: chrono::DateTime<chrono::Utc>,
    latitude: Latitude,
    longitude: Longitude,
    client_request_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use chrono::TimeZone;
    use sea_orm::{DatabaseBackend, MockDatabase, Value};

    use super::*;
    fn fixed_time() -> sea_orm::prelude::DateTimeWithTimeZone {
        chrono::Utc
            .with_ymd_and_hms(2026, 5, 24, 9, 0, 0)
            .single()
            .unwrap()
            .into()
    }

    fn walk_model(id: Uuid, user_id: Uuid) -> walk::Model {
        walk::Model {
            id,
            user_id,
            started_at: fixed_time(),
            ended_at: None,
            distance: None,
            created_at: fixed_time(),
            updated_at: fixed_time(),
        }
    }

    fn walk_dog_model(id: Uuid, walk_id: Uuid, dog_id: Uuid) -> walk_dog::Model {
        walk_dog::Model {
            id,
            walk_id,
            dog_id,
            created_at: fixed_time(),
            updated_at: fixed_time(),
        }
    }

    fn event_row(
        id: Uuid,
        walk_dog_id: Uuid,
        client_request_id: Option<Uuid>,
    ) -> BTreeMap<&'static str, Value> {
        BTreeMap::from([
            ("id", id.into()),
            ("walk_dog_id", walk_dog_id.into()),
            ("event", "pee".into()),
            ("occurred_at", fixed_time().into()),
            ("latitude", 35.68.into()),
            ("longitude", 139.76.into()),
            ("client_request_id", client_request_id.into()),
            ("created_at", fixed_time().into()),
            ("updated_at", fixed_time().into()),
        ])
    }

    fn add_event_input(
        walk_id: Uuid,
        dog_id: Uuid,
        client_request_id: Option<Uuid>,
    ) -> AddEventInput {
        AddEventInput {
            walk_id,
            dog_id,
            event: EventType::Pee,
            occurred_at: fixed_time().into(),
            latitude: 35.68.into(),
            longitude: 139.76.into(),
            client_request_id,
        }
    }

    #[tokio::test]
    async fn add_event_inserts_client_request_id() {
        let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
        let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
        let dog_id = Uuid::parse_str("019e0dc4-d1d6-77e0-be4f-f688025006e6").unwrap();
        let walk_dog_id = Uuid::parse_str("019e541e-81bb-7f16-bc34-d44a6d08fba1").unwrap();
        let event_id = Uuid::parse_str("019e5424-d959-7b54-a06a-0fdb40ce5129").unwrap();
        let client_request_id = Uuid::parse_str("019e5425-2744-774d-bd8c-6a012f09ba6e").unwrap();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[walk_model(walk_id, user_id)]])
            .append_query_results([[walk_dog_model(walk_dog_id, walk_id, dog_id)]])
            .append_query_results([Vec::<walk_dog_event::Model>::new()])
            .append_query_results([[event_row(event_id, walk_dog_id, Some(client_request_id))]])
            .into_connection();

        let event = add_event_for_user(
            &db,
            user_id,
            add_event_input(walk_id, dog_id, Some(client_request_id)),
        )
        .await
        .unwrap();

        assert_eq!(event.client_request_id, Some(client_request_id));
    }

    #[tokio::test]
    async fn add_event_returns_existing_event_for_matching_client_request_id() {
        let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
        let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
        let dog_id = Uuid::parse_str("019e0dc4-d1d6-77e0-be4f-f688025006e6").unwrap();
        let walk_dog_id = Uuid::parse_str("019e541e-81bb-7f16-bc34-d44a6d08fba1").unwrap();
        let event_id = Uuid::parse_str("019e5424-d959-7b54-a06a-0fdb40ce5129").unwrap();
        let client_request_id = Uuid::parse_str("019e5425-2744-774d-bd8c-6a012f09ba6e").unwrap();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[walk_model(walk_id, user_id)]])
            .append_query_results([[walk_dog_model(walk_dog_id, walk_id, dog_id)]])
            .append_query_results([[event_row(event_id, walk_dog_id, Some(client_request_id))]])
            .into_connection();

        let event = add_event_for_user(
            &db,
            user_id,
            add_event_input(walk_id, dog_id, Some(client_request_id)),
        )
        .await
        .unwrap();

        assert_eq!(event.id, event_id);
    }

    #[tokio::test]
    async fn add_event_rejects_conflicting_client_request_id() {
        let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
        let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
        let dog_id = Uuid::parse_str("019e0dc4-d1d6-77e0-be4f-f688025006e6").unwrap();
        let walk_dog_id = Uuid::parse_str("019e541e-81bb-7f16-bc34-d44a6d08fba1").unwrap();
        let other_walk_dog_id = Uuid::parse_str("019e541e-dc7e-7554-b1c7-2aa58dad4902").unwrap();
        let event_id = Uuid::parse_str("019e5424-d959-7b54-a06a-0fdb40ce5129").unwrap();
        let client_request_id = Uuid::parse_str("019e5425-2744-774d-bd8c-6a012f09ba6e").unwrap();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[walk_model(walk_id, user_id)]])
            .append_query_results([[walk_dog_model(walk_dog_id, walk_id, dog_id)]])
            .append_query_results([[event_row(
                event_id,
                other_walk_dog_id,
                Some(client_request_id),
            )]])
            .into_connection();

        let error = add_event_for_user(
            &db,
            user_id,
            add_event_input(walk_id, dog_id, Some(client_request_id)),
        )
        .await
        .unwrap_err()
        .to_string();

        assert!(error.contains("clientRequestId has already been used"));
    }
}
