use crate::entities::encounters::{
    self, ActiveModel as EncounterActiveModel, Entity as EncounterEntity, Model as EncounterModel,
};
use crate::error::AppError;
use crate::services::{dog_pair::DogPair, friendship_service};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, EntityTrait, QueryFilter, Set,
};
use uuid::Uuid;

pub async fn record_pairs<C: ConnectionTrait>(
    db: &C,
    pairs: &[DogPair],
    my_walk_id: Uuid,
    their_walk_id: Uuid,
    duration_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<Vec<EncounterModel>, AppError> {
    let mut result = Vec::new();

    for pair in pairs {
        let existing = EncounterEntity::find()
            .filter(
                Condition::any()
                    .add(encounters::Column::WalkId.eq(my_walk_id))
                    .add(encounters::Column::WalkId.eq(their_walk_id)),
            )
            .filter(encounters::Column::DogId1.eq(pair.first()))
            .filter(encounters::Column::DogId2.eq(pair.second()))
            .one(db)
            .await?;

        let encounter = if let Some(existing) = existing {
            let new_duration = existing.duration_sec.max(duration_sec);
            let mut active: encounters::ActiveModel = existing.into();
            active.duration_sec = Set(new_duration);
            active.met_at = Set(met_at.into());
            active.update(db).await?
        } else {
            let encounter = EncounterActiveModel {
                id: Set(Uuid::new_v4()),
                walk_id: Set(my_walk_id),
                dog_id_1: Set(pair.first()),
                dog_id_2: Set(pair.second()),
                duration_sec: Set(duration_sec),
                met_at: Set(met_at.into()),
                created_at: Set(met_at.into()),
            }
            .insert(db)
            .await?;

            friendship_service::upsert_friendship(db, *pair, duration_sec, met_at).await?;
            encounter
        };

        result.push(encounter);
    }

    Ok(result)
}

pub async fn update_pair_durations<C: ConnectionTrait>(
    db: &C,
    pairs: &[DogPair],
    my_walk_id: Uuid,
    duration_sec: i32,
) -> Result<bool, AppError> {
    for pair in pairs {
        let existing = EncounterEntity::find()
            .filter(encounters::Column::WalkId.eq(my_walk_id))
            .filter(encounters::Column::DogId1.eq(pair.first()))
            .filter(encounters::Column::DogId2.eq(pair.second()))
            .one(db)
            .await?;

        if let Some(existing) = existing {
            let old_duration = existing.duration_sec;
            let new_duration = old_duration.max(duration_sec);
            let mut active: encounters::ActiveModel = existing.into();
            active.duration_sec = Set(new_duration);
            active.update(db).await?;

            let delta = new_duration - old_duration;
            friendship_service::update_friendship_duration(db, *pair, delta).await?;
        }
    }

    Ok(true)
}
