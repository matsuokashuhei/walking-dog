use crate::entities::encounters::{
    self, ActiveModel as EncounterActiveModel, Entity as EncounterEntity, Model as EncounterModel,
};
use crate::error::AppError;
use crate::services::dog_pair::DogPair;
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, EntityTrait, QueryFilter, Set,
};
use uuid::Uuid;

use super::friendship_projection;

pub struct EncounterUpsert {
    pub encounter: EncounterModel,
    pub created: bool,
    pub duration_delta_sec: i32,
}

pub async fn upsert_pair<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    my_walk_id: Uuid,
    their_walk_id: Uuid,
    duration_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<EncounterUpsert, AppError> {
    let existing = find_pair_for_either_walk(db, pair, my_walk_id, their_walk_id).await?;

    let (encounter, created, duration_delta_sec) = if let Some(existing) = existing {
        let update = update_existing_duration(db, existing, duration_sec, met_at).await?;
        (update.encounter, false, update.duration_delta_sec)
    } else {
        (
            insert_pair(db, pair, my_walk_id, duration_sec, met_at).await?,
            true,
            0,
        )
    };

    Ok(EncounterUpsert {
        encounter,
        created,
        duration_delta_sec,
    })
}

pub async fn extend_duration_if_present<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    my_walk_id: Uuid,
    duration_sec: i32,
) -> Result<Option<i32>, AppError> {
    let Some(existing) = find_pair_for_walk(db, pair, my_walk_id).await? else {
        return Ok(None);
    };

    let old_duration = existing.duration_sec;
    let new_duration = max_recorded_duration(old_duration, duration_sec);
    let mut active: encounters::ActiveModel = existing.into();
    active.duration_sec = Set(new_duration);
    active.update(db).await?;

    Ok(Some(friendship_projection::duration_increase_delta(
        old_duration,
        new_duration,
    )))
}

fn max_recorded_duration(existing_duration_sec: i32, requested_duration_sec: i32) -> i32 {
    existing_duration_sec.max(requested_duration_sec)
}

async fn find_pair_for_either_walk<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    my_walk_id: Uuid,
    their_walk_id: Uuid,
) -> Result<Option<EncounterModel>, AppError> {
    EncounterEntity::find()
        .filter(
            Condition::any()
                .add(encounters::Column::WalkId.eq(my_walk_id))
                .add(encounters::Column::WalkId.eq(their_walk_id)),
        )
        .filter(encounters::Column::DogId1.eq(pair.first()))
        .filter(encounters::Column::DogId2.eq(pair.second()))
        .one(db)
        .await
        .map_err(AppError::Database)
}

async fn find_pair_for_walk<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    my_walk_id: Uuid,
) -> Result<Option<EncounterModel>, AppError> {
    EncounterEntity::find()
        .filter(encounters::Column::WalkId.eq(my_walk_id))
        .filter(encounters::Column::DogId1.eq(pair.first()))
        .filter(encounters::Column::DogId2.eq(pair.second()))
        .one(db)
        .await
        .map_err(AppError::Database)
}

struct ExistingEncounterUpdate {
    encounter: EncounterModel,
    duration_delta_sec: i32,
}

async fn update_existing_duration<C: ConnectionTrait>(
    db: &C,
    existing: EncounterModel,
    duration_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<ExistingEncounterUpdate, AppError> {
    let old_duration = existing.duration_sec;
    let new_duration = max_recorded_duration(old_duration, duration_sec);
    let mut active: encounters::ActiveModel = existing.into();
    active.duration_sec = Set(new_duration);
    active.met_at = Set(met_at.into());
    let encounter = active.update(db).await.map_err(AppError::Database)?;

    Ok(ExistingEncounterUpdate {
        encounter,
        duration_delta_sec: friendship_projection::duration_increase_delta(
            old_duration,
            new_duration,
        ),
    })
}

async fn insert_pair<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    my_walk_id: Uuid,
    duration_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<EncounterModel, AppError> {
    EncounterActiveModel {
        id: Set(Uuid::new_v4()),
        walk_id: Set(my_walk_id),
        dog_id_1: Set(pair.first()),
        dog_id_2: Set(pair.second()),
        duration_sec: Set(duration_sec),
        met_at: Set(met_at.into()),
        created_at: Set(met_at.into()),
    }
    .insert(db)
    .await
    .map_err(AppError::Database)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn max_recorded_duration_keeps_existing_when_new_duration_is_shorter() {
        assert_eq!(max_recorded_duration(60, 30), 60);
    }

    #[test]
    fn max_recorded_duration_uses_new_duration_when_it_is_longer() {
        assert_eq!(max_recorded_duration(30, 60), 60);
    }
}
