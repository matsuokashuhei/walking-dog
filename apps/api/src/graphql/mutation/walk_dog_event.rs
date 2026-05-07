use anyhow::Result;
use anyhow::anyhow;
use async_graphql::{Context, InputObject, Object};
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter};
use uuid::Uuid;

use crate::entity::{user, walk, walk_dog, walk_dog_event};
use crate::graphql::guard::AuthGuard;
use crate::graphql::object::coordinate::{Latitude, Longitude};
use crate::graphql::object::walk_dog_event::{EventType, WalkDogEvent};

#[derive(Default, Debug)]
pub struct WalkDogEventMutation;

#[Object]
impl WalkDogEventMutation {
    #[graphql(guard = "AuthGuard")]
    async fn add_event(&self, ctx: &Context<'_>, input: AddEventInput) -> Result<WalkDogEvent> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let Some(walk) = walk::Entity::find_by_id(input.walk_id)
            .filter(walk::Column::UserId.eq(user.id))
            .one(db)
            .await?
        else {
            return Err(anyhow!("Walk not found or not owned by user"));
        };

        if walk.ended_at.is_some() {
            return Err(anyhow!("Cannot add event to an ended walk"));
        }

        let started_at: chrono::DateTime<chrono::Utc> = walk.started_at.into();
        if input.occurred_at < started_at {
            return Err(anyhow!("Event occurred_at must be after walk started_at"));
        }

        let Some(walk_dog) = walk_dog::Entity::find()
            .filter(walk_dog::Column::WalkId.eq(input.walk_id))
            .filter(walk_dog::Column::DogId.eq(input.dog_id))
            .one(db)
            .await?
        else {
            return Err(anyhow!("Dog is not part of this walk"));
        };

        let event = walk_dog_event::ActiveModel {
            walk_dog_id: Set(walk_dog.id),
            event: Set(input.event.into()),
            occurred_at: Set(input.occurred_at.into()),
            latitude: Set(input.latitude.value()),
            longitude: Set(input.longitude.value()),
            ..Default::default()
        }
        .insert(db)
        .await?;

        Ok(WalkDogEvent::from(event))
    }
}

#[derive(Debug, InputObject)]
struct AddEventInput {
    walk_id: Uuid,
    dog_id: Uuid,
    event: EventType,
    occurred_at: chrono::DateTime<chrono::Utc>,
    latitude: Latitude,
    longitude: Longitude,
}
