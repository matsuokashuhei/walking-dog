use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set};
use std::fmt;
use std::str::FromStr;
use uuid::Uuid;

use crate::entities::{
    dog_members::{self, Entity as DogMemberEntity},
    users::{self, Entity as UserEntity},
    walk_dogs::{self, Entity as WalkDogEntity},
    walk_events::{
        ActiveModel as WalkEventActiveModel, Column as WalkEventColumn, Entity as WalkEventEntity,
        Model as WalkEventModel,
    },
    walks::Entity as WalkEntity,
};
use crate::error::AppError;
use crate::services::dog_member_service;

/// Walk event type. The DB column stays `text`; this enum drives validation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WalkEventType {
    Pee,
    Poo,
    Photo,
}

impl fmt::Display for WalkEventType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WalkEventType::Pee => write!(f, "pee"),
            WalkEventType::Poo => write!(f, "poo"),
            WalkEventType::Photo => write!(f, "photo"),
        }
    }
}

impl FromStr for WalkEventType {
    type Err = AppError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pee" => Ok(WalkEventType::Pee),
            "poo" => Ok(WalkEventType::Poo),
            "photo" => Ok(WalkEventType::Photo),
            other => Err(AppError::BadRequest(format!(
                "Invalid event_type: '{}'. Must be one of: pee, poo, photo",
                other
            ))),
        }
    }
}

pub struct RecordEventInput {
    pub dog_id: Option<Uuid>,
    pub event_type: String,
    pub occurred_at: sea_orm::prelude::DateTimeWithTimeZone,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    /// S3 key for photo events; required when event_type == "photo".
    pub photo_key: Option<String>,
}

/// Verify that encounter detection is allowed for the acting user's walk.
///
/// Checks:
/// 1. The walk exists.
/// 2. The walk belongs to `user_id` (ownership check).
/// 3. The user has `encounter_detection_enabled = true`.
pub async fn verify_encounter_detection(
    db: &sea_orm::DatabaseConnection,
    walk_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    // 1. Fetch walk
    let walk = WalkEntity::find_by_id(walk_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Walk {} not found", walk_id)))?;

    // 2. Ownership check
    if walk.user_id != user_id {
        return Err(AppError::Unauthorized(
            "Walk does not belong to user".to_string(),
        ));
    }

    // 3. Encounter detection enabled check
    let user = UserEntity::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", user_id)))?;

    if !user.encounter_detection_enabled {
        return Err(AppError::Unauthorized(
            "Encounter detection is disabled for your account".to_string(),
        ));
    }

    Ok(())
}

/// Verify that all users associated with the counterparty walk have encounter detection enabled.
///
/// This replaces the N+M nested loop in the resolver with 2 fixed queries:
/// 1. Walk_dogs WHERE walk_id = their_walk_id → dog_ids (all at once via IN)
/// 2. Dog_members WHERE dog_id IN (dog_ids) → user_ids, then users WHERE id IN (user_ids)
///    + filter encounter_detection_enabled = false
///
/// If any associated user has encounter detection disabled, returns `Unauthorized`.
pub async fn verify_counterparty_encounter_detection(
    db: &sea_orm::DatabaseConnection,
    their_walk_id: Uuid,
) -> Result<(), AppError> {
    // Query 1: get all dog_ids in the counterparty walk
    let dog_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(their_walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    if dog_ids.is_empty() {
        // No dogs in the counterparty walk — nothing to check
        return Ok(());
    }

    // Query 2: get user_ids of all members of those dogs
    let user_ids: Vec<Uuid> = DogMemberEntity::find()
        .filter(dog_members::Column::DogId.is_in(dog_ids))
        .select_only()
        .column(dog_members::Column::UserId)
        .into_tuple()
        .all(db)
        .await?;

    if user_ids.is_empty() {
        return Ok(());
    }

    // Query 3 (still fixed): check if any of those users has encounter detection disabled
    let opted_out = UserEntity::find()
        .filter(users::Column::Id.is_in(user_ids))
        .filter(users::Column::EncounterDetectionEnabled.eq(false))
        .one(db)
        .await?;

    if opted_out.is_some() {
        return Err(AppError::Unauthorized(
            "Encounter detection is disabled for the other user".to_string(),
        ));
    }

    Ok(())
}

/// Verify that the given user is authorized to record events for the walk.
///
/// Authorization passes if the user is the walk owner OR a member of any dog
/// that is part of the walk (walk_dogs -> dog_members).
pub async fn require_walk_access(
    db: &sea_orm::DatabaseConnection,
    walk_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    // Check walk ownership directly
    let walk = WalkEntity::find_by_id(walk_id).one(db).await?;

    let walk = walk.ok_or_else(|| AppError::NotFound(format!("Walk {} not found", walk_id)))?;

    if walk.user_id == user_id {
        return Ok(());
    }

    // Check membership via walk_dogs -> dog_members
    let walk_dog_rows = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(walk_id))
        .all(db)
        .await?;

    for wd in &walk_dog_rows {
        if dog_member_service::require_dog_member(db, wd.dog_id, user_id)
            .await
            .is_ok()
        {
            return Ok(());
        }
    }

    Err(AppError::Unauthorized(
        "Not authorized to record events for this walk".to_string(),
    ))
}

/// Record a walk event (pee / poo / photo).
///
/// Authorization: user must be walk owner or a member of any dog in the walk.
/// Validation:
/// - `event_type` must be one of "pee", "poo", "photo"
/// - `photo_key` must be Some when event_type == "photo", None otherwise
pub async fn record_event(
    db: &sea_orm::DatabaseConnection,
    walk_id: Uuid,
    user_id: Uuid,
    input: RecordEventInput,
) -> Result<WalkEventModel, AppError> {
    // Validate event_type via enum parse
    let event_type: WalkEventType = input.event_type.parse()?;

    // Validate photo_key requirement
    if event_type == WalkEventType::Photo && input.photo_key.is_none() {
        return Err(AppError::BadRequest(
            "photo_key is required for photo events".to_string(),
        ));
    }
    if event_type != WalkEventType::Photo && input.photo_key.is_some() {
        return Err(AppError::BadRequest(
            "photo_key must not be set for non-photo events".to_string(),
        ));
    }

    // Authorization check
    require_walk_access(db, walk_id, user_id).await?;

    let now = Utc::now();
    let event = WalkEventActiveModel {
        id: Set(Uuid::new_v4()),
        walk_id: Set(walk_id),
        dog_id: Set(input.dog_id),
        event_type: Set(event_type.to_string()),
        occurred_at: Set(input.occurred_at),
        lat: Set(input.lat),
        lng: Set(input.lng),
        photo_url: Set(input.photo_key),
        created_at: Set(now.into()),
    }
    .insert(db)
    .await?;

    Ok(event)
}

/// List all events for a walk, ordered by occurred_at ASC.
pub async fn list_events(
    db: &sea_orm::DatabaseConnection,
    walk_id: Uuid,
) -> Result<Vec<WalkEventModel>, AppError> {
    let events = WalkEventEntity::find()
        .filter(WalkEventColumn::WalkId.eq(walk_id))
        .order_by_asc(WalkEventColumn::OccurredAt)
        .all(db)
        .await?;

    Ok(events)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn walk_event_type_from_str_pee() {
        let t: WalkEventType = "pee".parse().unwrap();
        assert_eq!(t, WalkEventType::Pee);
    }

    #[test]
    fn walk_event_type_from_str_poo() {
        let t: WalkEventType = "poo".parse().unwrap();
        assert_eq!(t, WalkEventType::Poo);
    }

    #[test]
    fn walk_event_type_from_str_photo() {
        let t: WalkEventType = "photo".parse().unwrap();
        assert_eq!(t, WalkEventType::Photo);
    }

    #[test]
    fn walk_event_type_from_str_invalid_returns_error() {
        let result: Result<WalkEventType, _> = "bark".parse();
        assert!(result.is_err());
    }

    #[test]
    fn walk_event_type_display_roundtrip() {
        for t in [WalkEventType::Pee, WalkEventType::Poo, WalkEventType::Photo] {
            let s = t.to_string();
            let back: WalkEventType = s.parse().unwrap();
            assert_eq!(back, t);
        }
    }
}
