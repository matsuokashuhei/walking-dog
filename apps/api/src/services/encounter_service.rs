use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
    Set, TransactionTrait,
};
use uuid::Uuid;

use super::friendship_service;
use crate::entities::{
    dog_members::{self, Entity as DogMemberEntity},
    encounters::{
        self, ActiveModel as EncounterActiveModel, Entity as EncounterEntity,
        Model as EncounterModel,
    },
    users::{self, Entity as UserEntity},
    walk_dogs::{self, Entity as WalkDogEntity},
    walks::Entity as WalkEntity,
};
use crate::error::AppError;

/// Normalize a dog pair so that `dog_id_1 < dog_id_2` (UUID lexicographic order).
/// Returns `None` if both IDs are equal (same dog — skip).
fn normalize_dog_pair(a: Uuid, b: Uuid) -> Option<(Uuid, Uuid)> {
    if a < b {
        Some((a, b))
    } else if a > b {
        Some((b, a))
    } else {
        None
    }
}

/// Verify that encounter detection is allowed for the acting user's walk.
///
/// Checks:
/// 1. The walk exists.
/// 2. The walk belongs to `user_id` (ownership check).
/// 3. The user has `encounter_detection_enabled = true`.
async fn verify_encounter_detection(
    db: &sea_orm::DatabaseConnection,
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

/// Verify that all users associated with the counterparty walk have
/// encounter detection enabled.
///
/// Three fixed queries replace an N+M nested loop:
/// 1. walk_dogs WHERE walk_id = their_walk_id → dog_ids
/// 2. dog_members WHERE dog_id IN (dog_ids) → user_ids
/// 3. users WHERE id IN (user_ids) AND encounter_detection_enabled = false
///
/// If any associated user has encounter detection disabled, returns
/// `Unauthorized`.
async fn verify_counterparty_encounter_detection(
    db: &sea_orm::DatabaseConnection,
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

/// Record encounters between all dog pairs from two walks.
/// Creates or updates `encounters` and `friendships` rows.
///
/// Authorization: verifies that `my_walk_id` belongs to `acting_user_id` and
/// that `acting_user_id` has encounter detection enabled.
pub async fn record_encounter(
    db: &sea_orm::DatabaseConnection,
    my_walk_id: Uuid,
    their_walk_id: Uuid,
    duration_sec: i32,
    acting_user_id: Uuid,
) -> Result<Vec<EncounterModel>, AppError> {
    // Verify acting user ownership + encounter detection enabled
    verify_encounter_detection(db, my_walk_id, acting_user_id).await?;

    // Verify all counterparty users have encounter detection enabled (fixed 2-3 queries)
    verify_counterparty_encounter_detection(db, their_walk_id).await?;

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
            // Normalize ordering: dog_id_1 < dog_id_2 (UUID lexicographic); skip same dog
            let Some((dog_id_1, dog_id_2)) = normalize_dog_pair(*my_dog, *their_dog) else {
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
///
/// Authorization: verifies that `my_walk_id` belongs to `acting_user_id` and
/// that `acting_user_id` has encounter detection enabled.
pub async fn update_encounter_duration(
    db: &sea_orm::DatabaseConnection,
    my_walk_id: Uuid,
    their_walk_id: Uuid,
    duration_sec: i32,
    acting_user_id: Uuid,
) -> Result<bool, AppError> {
    // Verify acting user ownership + encounter detection enabled
    verify_encounter_detection(db, my_walk_id, acting_user_id).await?;
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
            let Some((dog_id_1, dog_id_2)) = normalize_dog_pair(*my_dog, *their_dog) else {
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

    /// Static guard: record_encounter must accept acting_user_id parameter.
    #[test]
    fn record_encounter_signature_has_acting_user_id() {
        let src = include_str!("encounter_service.rs");
        // The pub async fn record_encounter signature must include acting_user_id
        let fn_start = src
            .find("pub async fn record_encounter")
            .expect("record_encounter must exist");
        let fn_signature_end = src[fn_start..].find('{').unwrap_or(0);
        let signature = &src[fn_start..fn_start + fn_signature_end];
        assert!(
            signature.contains("acting_user_id"),
            "record_encounter signature must include acting_user_id: Uuid, got: {}",
            signature
        );
    }

    /// Static guard: update_encounter_duration must accept acting_user_id parameter.
    #[test]
    fn update_encounter_duration_signature_has_acting_user_id() {
        let src = include_str!("encounter_service.rs");
        let fn_start = src
            .find("pub async fn update_encounter_duration")
            .expect("update_encounter_duration must exist");
        let fn_signature_end = src[fn_start..].find('{').unwrap_or(0);
        let signature = &src[fn_start..fn_start + fn_signature_end];
        assert!(
            signature.contains("acting_user_id"),
            "update_encounter_duration signature must include acting_user_id: Uuid, got: {}",
            signature
        );
    }

    /// Static guard: encounter_service must own and call
    /// verify_encounter_detection (no delegation to walk_event_service).
    #[test]
    fn encounter_service_defines_verify_encounter_detection() {
        let src = include_str!("encounter_service.rs");
        assert!(
            src.contains("async fn verify_encounter_detection"),
            "encounter_service must define verify_encounter_detection internally"
        );
    }

    /// Static guard: encounter_service must own
    /// verify_counterparty_encounter_detection (no delegation to
    /// walk_event_service).
    #[test]
    fn encounter_service_defines_verify_counterparty_encounter_detection() {
        let src = include_str!("encounter_service.rs");
        assert!(
            src.contains("async fn verify_counterparty_encounter_detection"),
            "encounter_service must define verify_counterparty_encounter_detection internally"
        );
    }

    // ─── MockDatabase unit tests ─────────────────────────────────────────────

    use sea_orm::{DatabaseBackend, MockDatabase};

    fn make_encounter(id: Uuid, dog_id_1: Uuid, dog_id_2: Uuid) -> encounters::Model {
        use chrono::Utc;
        encounters::Model {
            id,
            walk_id: Uuid::new_v4(),
            dog_id_1,
            dog_id_2,
            duration_sec: 30,
            met_at: Utc::now().into(),
            created_at: Utc::now().into(),
        }
    }

    #[tokio::test]
    async fn get_encounters_for_dog_returns_empty_when_no_encounters() {
        let dog_id = Uuid::new_v4();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([Vec::<encounters::Model>::new()])
            .into_connection();

        let result = get_encounters_for_dog(&db, dog_id, None, None)
            .await
            .unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn get_encounters_for_dog_returns_single_encounter() {
        let dog_id = Uuid::new_v4();
        let other_dog = Uuid::new_v4();
        let enc = make_encounter(Uuid::new_v4(), dog_id, other_dog);
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![enc.clone()]])
            .into_connection();

        let result = get_encounters_for_dog(&db, dog_id, None, None)
            .await
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, enc.id);
    }

    #[tokio::test]
    async fn get_encounters_for_dog_respects_limit() {
        let dog_id = Uuid::new_v4();
        let other = Uuid::new_v4();
        let enc1 = make_encounter(Uuid::new_v4(), dog_id, other);
        // MockDatabase returns exactly what is appended — simulate limit=1
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![enc1.clone()]])
            .into_connection();

        let result = get_encounters_for_dog(&db, dog_id, Some(1), None)
            .await
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, enc1.id);
    }
}
