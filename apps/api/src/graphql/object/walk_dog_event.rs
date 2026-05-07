use async_graphql::{ComplexObject, Enum, SimpleObject};
use uuid::Uuid;

use crate::entity::{sea_orm_active_enums, walk_dog_event};
use crate::graphql::object::coordinate::{Coordinate, Latitude, Longitude};

#[derive(Enum, Debug, Copy, Clone, Eq, PartialEq)]
pub enum EventType {
    Pee,
    Poo,
    Sniff,
    Greet,
}

impl From<sea_orm_active_enums::EventType> for EventType {
    fn from(event_type: sea_orm_active_enums::EventType) -> Self {
        match event_type {
            sea_orm_active_enums::EventType::Pee => EventType::Pee,
            sea_orm_active_enums::EventType::Poo => EventType::Poo,
            sea_orm_active_enums::EventType::Sniff => EventType::Sniff,
            sea_orm_active_enums::EventType::Greet => EventType::Greet,
        }
    }
}

impl From<EventType> for sea_orm_active_enums::EventType {
    fn from(event_type: EventType) -> Self {
        match event_type {
            EventType::Pee => sea_orm_active_enums::EventType::Pee,
            EventType::Poo => sea_orm_active_enums::EventType::Poo,
            EventType::Sniff => sea_orm_active_enums::EventType::Sniff,
            EventType::Greet => sea_orm_active_enums::EventType::Greet,
        }
    }
}

#[derive(SimpleObject, Clone, Debug)]
pub struct WalkDogEvent {
    pub id: Uuid,
    pub walk_dog_id: Uuid,
    pub event: EventType,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
    pub coordinate: Coordinate,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<walk_dog_event::Model> for WalkDogEvent {
    fn from(model: walk_dog_event::Model) -> Self {
        WalkDogEvent {
            id: model.id,
            walk_dog_id: model.walk_dog_id,
            event: model.event.into(),
            occurred_at: model.occurred_at.into(),
            coordinate: Coordinate {
                latitude: model.latitude.into(),
                longitude: model.longitude.into(),
            },
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
