use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, ExprTrait, QueryFilter, QueryOrder, QuerySelect,
    Select, sea_query::Expr,
};
use uuid::Uuid;

use crate::{
    entity::{walk, walk_dog},
    service::error::ServiceResult,
};

#[derive(Clone, Debug, Default)]
pub struct WalkHistoryRequest {
    pub after: Option<Uuid>,
    pub before: Option<Uuid>,
    pub first: Option<usize>,
    pub last: Option<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WalkHistoryPage {
    pub walks: Vec<walk::Model>,
    pub total_count: i64,
    pub total_distance: i64,
    pub total_duration: i64,
    pub has_previous: bool,
    pub has_next: bool,
}

pub async fn user_walk_history<C>(
    db: &C,
    user_id: Uuid,
    request: WalkHistoryRequest,
) -> ServiceResult<WalkHistoryPage>
where
    C: ConnectionTrait,
{
    let query = walk::Entity::find().filter(walk::Column::UserId.eq(user_id));
    walk_history(db, query, request).await
}

pub async fn dog_walk_history<C>(
    db: &C,
    user_id: Uuid,
    dog_id: Uuid,
    request: WalkHistoryRequest,
) -> ServiceResult<WalkHistoryPage>
where
    C: ConnectionTrait,
{
    let query = walk::Entity::find()
        .filter(walk::Column::UserId.eq(user_id))
        .has_related(walk_dog::Entity, walk_dog::Column::DogId.eq(dog_id));
    walk_history(db, query, request).await
}

async fn walk_history<C>(
    db: &C,
    mut query: Select<walk::Entity>,
    request: WalkHistoryRequest,
) -> ServiceResult<WalkHistoryPage>
where
    C: ConnectionTrait,
{
    let (total_count, total_distance, total_duration) = aggregate(db, query.clone()).await?;
    let has_after = request.after.is_some();
    let has_before = request.before.is_some();

    query = query.order_by(walk::Column::Id, sea_orm::Order::Desc);
    if let Some(after) = request.after {
        query = query.filter(walk::Column::Id.lt(after));
    }
    if let Some(before) = request.before {
        query = query.filter(walk::Column::Id.gt(before));
    }

    let mut has_previous = has_after;
    let mut has_next = has_before;
    let mut walks = query.all(db).await?;
    if let Some(first) = request.first {
        if walks.len() > first {
            has_next = true;
        }
        walks.truncate(first);
    }
    if let Some(last) = request.last {
        if walks.len() > last {
            has_previous = true;
        }
        walks = walks.split_off(walks.len().saturating_sub(last));
    }

    Ok(WalkHistoryPage {
        walks,
        total_count,
        total_distance,
        total_duration,
        has_previous,
        has_next,
    })
}

async fn aggregate<C>(db: &C, query: Select<walk::Entity>) -> ServiceResult<(i64, i64, i64)>
where
    C: ConnectionTrait,
{
    let aggregate = query
        .select_only()
        .column_as(Expr::col(walk::Column::Id).count(), "total_count")
        .column_as(
            Expr::cust("COALESCE(SUM(distance), 0)::bigint"),
            "total_distance",
        )
        .column_as(
            Expr::cust("COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0)::bigint"),
            "total_duration",
        )
        .into_tuple()
        .one(db)
        .await?
        .unwrap_or_default();
    Ok(aggregate)
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use sea_orm::{DatabaseBackend, MockDatabase, Value};

    use super::*;

    fn aggregate_row(
        total_count: i64,
        total_distance: i64,
        total_duration: i64,
    ) -> BTreeMap<&'static str, Value> {
        BTreeMap::from([
            ("total_count", total_count.into()),
            ("total_distance", total_distance.into()),
            ("total_duration", total_duration.into()),
        ])
    }

    #[tokio::test]
    async fn aggregate_coalesces_nullable_sums_to_zero() {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([[aggregate_row(1, 0, 0)]])
            .into_connection();

        let aggregate = aggregate(&db, walk::Entity::find()).await.unwrap();

        assert_eq!(aggregate, (1, 0, 0));
        let log = db.into_transaction_log();
        let sql = log[0].statements()[0].sql.to_uppercase();
        assert!(sql.contains("COALESCE"));
    }
}
