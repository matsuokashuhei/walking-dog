use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
    Set, TransactionTrait,
};
use uuid::Uuid;

use super::friendship_service;
use crate::entities::{
    encounters::{
        self, ActiveModel as EncounterActiveModel, Entity as EncounterEntity,
        Model as EncounterModel,
    },
    walk_dogs::{self, Entity as WalkDogEntity},
};
use crate::error::AppError;

/// Record encounters between all dog pairs from two walks.
/// Creates or updates `encounters` and `friendships` rows.
pub async fn record_encounter(
    db: &sea_orm::DatabaseConnection,
    my_walk_id: Uuid,
    their_walk_id: Uuid,
    duration_sec: i32,
) -> Result<Vec<EncounterModel>, AppError> {
    // Fetch all dog IDs in each walk
    let my_dog_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(my_walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    let their_dog_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(their_walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    if my_dog_ids.is_empty() || their_dog_ids.is_empty() {
        return Err(AppError::BadRequest(
            "One or both walks have no dogs".to_string(),
        ));
    }

    let met_at = Utc::now();
    let mut result = Vec::new();

    let txn = db.begin().await?;

    for my_dog in &my_dog_ids {
        for their_dog in &their_dog_ids {
            // Normalize ordering: dog_id_1 < dog_id_2 (UUID lexicographic)
            let (dog_id_1, dog_id_2) = if my_dog < their_dog {
                (*my_dog, *their_dog)
            } else if my_dog > their_dog {
                (*their_dog, *my_dog)
            } else {
                // Same dog — skip
                continue;
            };

            // Find existing encounter for this dog pair (from either walk direction)
            let existing = EncounterEntity::find()
                .filter(
                    Condition::any()
                        .add(encounters::Column::WalkId.eq(my_walk_id))
                        .add(encounters::Column::WalkId.eq(their_walk_id)),
                )
                .filter(encounters::Column::DogId1.eq(dog_id_1))
                .filter(encounters::Column::DogId2.eq(dog_id_2))
                .one(&txn)
                .await?;

            let encounter = if let Some(existing) = existing {
                // Update duration if longer
                let new_duration = existing.duration_sec.max(duration_sec);
                let mut active: encounters::ActiveModel = existing.into();
                active.duration_sec = Set(new_duration);
                active.met_at = Set(met_at.into());
                active.update(&txn).await?
            } else {
                // Insert new encounter
                let encounter = EncounterActiveModel {
                    id: Set(Uuid::new_v4()),
                    walk_id: Set(my_walk_id),
                    dog_id_1: Set(dog_id_1),
                    dog_id_2: Set(dog_id_2),
                    duration_sec: Set(duration_sec),
                    met_at: Set(met_at.into()),
                    created_at: Set(met_at.into()),
                }
                .insert(&txn)
                .await?;

                // Upsert friendship (first encounter creates it)
                friendship_service::upsert_friendship(
                    &txn,
                    dog_id_1,
                    dog_id_2,
                    duration_sec,
                    met_at,
                )
                .await?;

                encounter
            };

            result.push(encounter);
        }
    }

    txn.commit().await?;
    Ok(result)
}

/// Update the duration of an existing encounter (called when BLE signal ends).
pub async fn update_encounter_duration(
    db: &sea_orm::DatabaseConnection,
    my_walk_id: Uuid,
    their_walk_id: Uuid,
    duration_sec: i32,
) -> Result<bool, AppError> {
    let their_dog_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(their_walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    let my_dog_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(my_walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    for my_dog in &my_dog_ids {
        for their_dog in &their_dog_ids {
            let (dog_id_1, dog_id_2) = if my_dog < their_dog {
                (*my_dog, *their_dog)
            } else if my_dog > their_dog {
                (*their_dog, *my_dog)
            } else {
                continue;
            };

            let existing = EncounterEntity::find()
                .filter(encounters::Column::WalkId.eq(my_walk_id))
                .filter(encounters::Column::DogId1.eq(dog_id_1))
                .filter(encounters::Column::DogId2.eq(dog_id_2))
                .one(db)
                .await?;

            if let Some(existing) = existing {
                let old_duration = existing.duration_sec;
                let new_duration = old_duration.max(duration_sec);
                let mut active: encounters::ActiveModel = existing.into();
                active.duration_sec = Set(new_duration);
                active.update(db).await?;

                // Update friendship total_interaction_sec with precise delta
                let delta = new_duration - old_duration;
                friendship_service::update_friendship_duration(db, dog_id_1, dog_id_2, delta)
                    .await?;
            }
        }
    }

    Ok(true)
}

/// Get encounter history for a dog, ordered by met_at DESC.
pub async fn get_encounters_for_dog(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<Vec<EncounterModel>, AppError> {
    let mut query = EncounterEntity::find()
        .filter(
            Condition::any()
                .add(encounters::Column::DogId1.eq(dog_id))
                .add(encounters::Column::DogId2.eq(dog_id)),
        )
        .order_by_desc(encounters::Column::MetAt);

    if let Some(o) = offset {
        query = query.offset(o);
    }
    if let Some(l) = limit {
        query = query.limit(l);
    }

    let encounters = query.all(db).await?;
    Ok(encounters)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_dog_pair_returns_ordered_pair_when_a_less_than_b() {
        let a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let result = normalize_dog_pair(a, b);
        assert_eq!(result, Some((a, b)));
    }

    #[test]
    fn normalize_dog_pair_returns_swapped_pair_when_a_greater_than_b() {
        let a = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let b = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let result = normalize_dog_pair(a, b);
        assert_eq!(result, Some((b, a)));
    }

    #[test]
    fn normalize_dog_pair_returns_none_when_same_dog() {
        let id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let result = normalize_dog_pair(id, id);
        assert_eq!(result, None);
    }
}
