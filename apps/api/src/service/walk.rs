use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QuerySelect, TransactionTrait,
};
use uuid::Uuid;

use crate::{
    entity::{dog, user_dog, walk, walk_dog},
    service::{
        error::{ServiceError, ServiceResult, map_transaction_error},
        track_point::TrackPointRepository,
    },
    util::{distance::cumulative_distance_meters, error::format_error_chain},
};

pub async fn start_walk(
    db: &DatabaseConnection,
    user_id: Uuid,
    dog_ids: &[Uuid],
) -> ServiceResult<walk::Model> {
    let dog_ids = dog_ids.to_vec();
    db.transaction::<_, walk::Model, ServiceError>(|txn| {
        Box::pin(async move {
            let walk = walk::ActiveModel {
                user_id: Set(user_id),
                started_at: Set(chrono::Utc::now().into()),
                ..Default::default()
            }
            .insert(txn)
            .await?;

            for dog_id in dog_ids.iter() {
                let dog: Option<Uuid> = dog::Entity::find_by_id(*dog_id)
                    .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user_id))
                    .select_only()
                    .column(dog::Column::Id)
                    .into_tuple()
                    .one(txn)
                    .await?;
                if dog.is_none() {
                    return Err(ServiceError::NotFound);
                }
                walk_dog::ActiveModel {
                    walk_id: Set(walk.id),
                    dog_id: Set(*dog_id),
                    ..Default::default()
                }
                .insert(txn)
                .await?;
            }

            Ok(walk)
        })
    })
    .await
    .map_err(map_transaction_error)
}

pub async fn finish_walk<R>(
    db: &DatabaseConnection,
    track_points: &R,
    user_id: Uuid,
    walk_id: Uuid,
    ended_at: chrono::DateTime<chrono::Utc>,
) -> ServiceResult<walk::Model>
where
    R: TrackPointRepository + ?Sized,
{
    let walk = ensure_walk_belongs_to_user(db, user_id, walk_id).await?;
    if walk.ended_at.is_some() {
        return Ok(walk);
    }

    let distance = live_distance_meters(track_points, walk.id).await?;
    let active_model = walk::ActiveModel {
        id: Set(walk.id),
        ended_at: Set(Some(ended_at.into())),
        distance: Set(Some(distance)),
        ..Default::default()
    };
    active_model.update(db).await.map_err(ServiceError::from)
}

pub async fn live_distance_meters<R>(track_points: &R, walk_id: Uuid) -> ServiceResult<i64>
where
    R: TrackPointRepository + ?Sized,
{
    let points = track_points
        .find_all_by_walk_id(walk_id)
        .await
        .map_err(|error| ServiceError::Internal(format_error_chain(&error)))?;
    Ok(cumulative_distance_meters(&points).round() as i64)
}

pub async fn ensure_walk_belongs_to_user<C>(
    db: &C,
    user_id: Uuid,
    walk_id: Uuid,
) -> ServiceResult<walk::Model>
where
    C: ConnectionTrait,
{
    walk::Entity::find_by_id(walk_id)
        .filter(walk::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or(ServiceError::NotFound)
}

pub fn ensure_walk_is_active(
    walk: &walk::Model,
    ended_message: impl Into<String>,
) -> ServiceResult<()> {
    if walk.ended_at.is_some() {
        return Err(ServiceError::UnprocessableEntity(ended_message.into()));
    }
    Ok(())
}

pub async fn ensure_dog_participates_in_walk<C>(
    db: &C,
    walk_id: Uuid,
    dog_id: Uuid,
) -> ServiceResult<walk_dog::Model>
where
    C: ConnectionTrait,
{
    walk_dog::Entity::find()
        .filter(walk_dog::Column::WalkId.eq(walk_id))
        .filter(walk_dog::Column::DogId.eq(dog_id))
        .one(db)
        .await?
        .ok_or(ServiceError::NotFound)
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use chrono::TimeZone;
    use sea_orm::{DatabaseBackend, MockDatabase, Value};

    use super::*;

    fn fixed_time() -> sea_orm::prelude::DateTimeWithTimeZone {
        chrono::Utc
            .with_ymd_and_hms(2026, 5, 23, 9, 15, 11)
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

    fn dog_id_row(id: Uuid) -> BTreeMap<&'static str, Value> {
        BTreeMap::from([("id", id.into())])
    }

    #[tokio::test]
    async fn start_walk_rolls_back_when_a_dog_is_not_registered_to_user() {
        let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
        let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
        let stale_dog_id = Uuid::parse_str("019e0c14-2b36-73b3-8db2-01bbf64d0af9").unwrap();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[walk_model(walk_id, user_id)]])
            .append_query_results([Vec::<dog::Model>::new()])
            .into_connection();

        let result = start_walk(&db, user_id, &[stale_dog_id]).await;

        assert!(result.is_err());
        let log = db.into_transaction_log();
        assert_eq!(log.len(), 1);
        assert!(
            log[0]
                .statements()
                .last()
                .is_some_and(|statement| statement.sql == "ROLLBACK")
        );
    }

    #[tokio::test]
    async fn start_walk_commits_walk_and_walk_dogs_for_registered_dogs() {
        let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
        let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
        let dog_id = Uuid::parse_str("019e0dc4-d1d6-77e0-be4f-f688025006e6").unwrap();
        let walk_dog_id = Uuid::parse_str("019e541e-81bb-7f16-bc34-d44a6d08fba1").unwrap();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[walk_model(walk_id, user_id)]])
            .append_query_results([[dog_id_row(dog_id)]])
            .append_query_results([[walk_dog_model(walk_dog_id, walk_id, dog_id)]])
            .into_connection();

        let walk = start_walk(&db, user_id, &[dog_id]).await.unwrap();

        assert_eq!(walk.id, walk_id);
        let log = db.into_transaction_log();
        assert_eq!(log.len(), 1);
        assert!(
            log[0]
                .statements()
                .last()
                .is_some_and(|statement| statement.sql == "COMMIT")
        );
    }
}
