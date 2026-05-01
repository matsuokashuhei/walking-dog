use chrono::Utc;
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
    TransactionTrait,
};
use uuid::Uuid;

use crate::entities::encounters::{self, Entity as EncounterEntity, Model as EncounterModel};
use crate::error::AppError;
mod access_policy;
mod encounter_repository;
mod friendship_projection;
mod pairs;

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
    access_policy::verify_record_encounter_allowed(db, my_walk_id, their_walk_id, acting_user_id)
        .await?;
    let dog_pairs = load_dog_pairs(db, my_walk_id, their_walk_id).await?;
    let met_at = Utc::now();

    let txn = db.begin().await?;
    let result = record_pairs_and_project_friendships(
        &txn,
        &dog_pairs,
        my_walk_id,
        their_walk_id,
        duration_sec,
        met_at,
    )
    .await?;

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
    access_policy::verify_encounter_detection(db, my_walk_id, acting_user_id).await?;
    let dog_pairs = load_dog_pairs(db, my_walk_id, their_walk_id).await?;
    update_pair_durations_and_project_friendships(db, &dog_pairs, my_walk_id, duration_sec).await
}

async fn load_dog_pairs<C: ConnectionTrait>(
    db: &C,
    my_walk_id: Uuid,
    their_walk_id: Uuid,
) -> Result<Vec<crate::services::dog_pair::DogPair>, AppError> {
    let my_dog_ids = pairs::dog_ids_for_walk(db, my_walk_id).await?;
    let their_dog_ids = pairs::dog_ids_for_walk(db, their_walk_id).await?;
    pairs::expand_pairs(&my_dog_ids, &their_dog_ids)
}

async fn record_pairs_and_project_friendships<C: ConnectionTrait>(
    db: &C,
    dog_pairs: &[crate::services::dog_pair::DogPair],
    my_walk_id: Uuid,
    their_walk_id: Uuid,
    duration_sec: i32,
    met_at: chrono::DateTime<Utc>,
) -> Result<Vec<EncounterModel>, AppError> {
    let mut encounters = Vec::with_capacity(dog_pairs.len());

    for pair in dog_pairs {
        let upsert = encounter_repository::upsert_pair(
            db,
            *pair,
            my_walk_id,
            their_walk_id,
            duration_sec,
            met_at,
        )
        .await?;

        if upsert.created {
            friendship_projection::record_new_encounter(db, *pair, duration_sec, met_at).await?;
        } else {
            friendship_projection::record_existing_encounter_update(
                db,
                *pair,
                upsert.duration_delta_sec,
                met_at,
            )
            .await?;
        }

        encounters.push(upsert.encounter);
    }

    Ok(encounters)
}

async fn update_pair_durations_and_project_friendships<C: ConnectionTrait>(
    db: &C,
    dog_pairs: &[crate::services::dog_pair::DogPair],
    my_walk_id: Uuid,
    duration_sec: i32,
) -> Result<bool, AppError> {
    for pair in dog_pairs {
        if let Some(delta_sec) =
            encounter_repository::extend_duration_if_present(db, *pair, my_walk_id, duration_sec)
                .await?
        {
            friendship_projection::apply_duration_delta(db, *pair, delta_sec).await?;
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
