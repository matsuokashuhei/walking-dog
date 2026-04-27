use crate::entities::{
    dog_members::{self, Entity as DogMemberEntity},
    users::{self, Entity as UserEntity},
    walk_dogs::{self, Entity as WalkDogEntity},
    walks::Entity as WalkEntity,
};
use crate::error::AppError;
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect};
use uuid::Uuid;

pub async fn verify_encounter_detection<C: ConnectionTrait>(
    db: &C,
    walk_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    let walk = WalkEntity::find_by_id(walk_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Walk {} not found", walk_id)))?;

    if walk.user_id != user_id {
        return Err(AppError::Unauthorized(
            "Walk does not belong to user".to_string(),
        ));
    }

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

pub async fn verify_counterparty_encounter_detection<C: ConnectionTrait>(
    db: &C,
    their_walk_id: Uuid,
) -> Result<(), AppError> {
    let dog_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(their_walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    if dog_ids.is_empty() {
        return Ok(());
    }

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
