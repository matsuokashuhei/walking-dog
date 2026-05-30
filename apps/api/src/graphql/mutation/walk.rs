use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QuerySelect, TransactionError, TransactionTrait,
};
use uuid::Uuid;

use crate::entity::{dog, user, user_dog};
use crate::graphql::{error::AppError, guard::AuthGuard, object::walk::Walk};

#[derive(Default, Debug)]
pub struct WalkMutation;

async fn start_walk_for_user(
    db: &DatabaseConnection,
    user_id: Uuid,
    dog_ids: &[Uuid],
) -> Result<crate::entity::walk::Model> {
    let dog_ids = dog_ids.to_vec();
    db.transaction::<_, crate::entity::walk::Model, anyhow::Error>(|txn| {
        Box::pin(async move {
            let walk = crate::entity::walk::ActiveModel {
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
                    return Err(AppError::NotFound.into());
                }
                let active_model = crate::entity::walk_dog::ActiveModel {
                    walk_id: Set(walk.id),
                    dog_id: Set(*dog_id),
                    ..Default::default()
                };
                active_model.insert(txn).await?;
            }

            Ok(walk)
        })
    })
    .await
    .map_err(|error| match error {
        TransactionError::Connection(error) => error.into(),
        TransactionError::Transaction(error) => error,
    })
}

#[Object]
impl WalkMutation {
    #[graphql(guard = "AuthGuard")]
    async fn start_walk(&self, ctx: &Context<'_>, input: StartWalkInput) -> Result<Walk> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let walk = start_walk_for_user(db, user.id, &input.dog_ids).await?;
        Ok(Walk::from(walk))
    }

    #[graphql(guard = "AuthGuard")]
    async fn end_walk(&self, ctx: &Context<'_>, input: EndWalkInput) -> Result<Walk> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let dynamo_client = ctx.data::<aws_sdk_dynamodb::Client>().unwrap();
        let Some(walk) = crate::entity::walk::Entity::find_by_id(input.id)
            .filter(crate::entity::walk::Column::UserId.eq(user.id))
            .one(db)
            .await?
        else {
            return Err(AppError::NotFound.into());
        };

        if walk.ended_at.is_some() {
            return Ok(Walk::from(walk));
        }

        let points = walk.points(dynamo_client).await?;
        let distance_m = crate::util::distance::cumulative_distance_meters(&points);

        let active_model = crate::entity::walk::ActiveModel {
            id: Set(walk.id),
            ended_at: Set(Some(chrono::Utc::now().into())),
            distance: Set(Some(distance_m.round() as i64)),
            ..Default::default()
        };
        let updated_walk = active_model.update(db).await?;
        Ok(Walk::from(updated_walk))
    }
}

#[derive(Clone, Debug, InputObject)]
struct StartWalkInput {
    dog_ids: Vec<Uuid>,
}

#[derive(Clone, Debug, InputObject)]
struct EndWalkInput {
    id: Uuid,
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use chrono::TimeZone;
    use sea_orm::{DatabaseBackend, MockDatabase, Value};

    use super::*;
    use crate::entity::walk_dog;

    fn fixed_time() -> sea_orm::prelude::DateTimeWithTimeZone {
        chrono::Utc
            .with_ymd_and_hms(2026, 5, 23, 9, 15, 11)
            .single()
            .unwrap()
            .into()
    }

    fn walk_model(id: Uuid, user_id: Uuid) -> crate::entity::walk::Model {
        crate::entity::walk::Model {
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
    async fn start_walk_rolls_back_when_a_dog_is_not_owned_by_user() {
        let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
        let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
        let stale_dog_id = Uuid::parse_str("019e0c14-2b36-73b3-8db2-01bbf64d0af9").unwrap();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[walk_model(walk_id, user_id)]])
            .append_query_results([Vec::<dog::Model>::new()])
            .into_connection();

        let result = start_walk_for_user(&db, user_id, &[stale_dog_id]).await;

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
    async fn start_walk_commits_walk_and_walk_dogs_for_owned_dogs() {
        let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
        let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
        let dog_id = Uuid::parse_str("019e0dc4-d1d6-77e0-be4f-f688025006e6").unwrap();
        let walk_dog_id = Uuid::parse_str("019e541e-81bb-7f16-bc34-d44a6d08fba1").unwrap();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[walk_model(walk_id, user_id)]])
            .append_query_results([[dog_id_row(dog_id)]])
            .append_query_results([[walk_dog_model(walk_dog_id, walk_id, dog_id)]])
            .into_connection();

        let walk = start_walk_for_user(&db, user_id, &[dog_id]).await.unwrap();

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
