use async_graphql::{SimpleObject, connection::CursorType};
use sea_orm::{
    ColumnTrait, DatabaseConnection, DbErr, ExprTrait, FromQueryResult, QueryFilter, QuerySelect,
    Select, sea_query::Expr,
};
use uuid::Uuid;

use crate::entity::walk;

#[derive(Clone, Debug)]
pub(crate) struct UuidCursor {
    pub(crate) id: Uuid,
}

impl CursorType for UuidCursor {
    type Error = String;

    fn decode_cursor(cursor: &str) -> std::result::Result<Self, Self::Error> {
        Ok(UuidCursor {
            id: Uuid::parse_str(cursor).map_err(|e| e.to_string())?,
        })
    }

    fn encode_cursor(&self) -> String {
        self.id.to_string()
    }
}

#[derive(SimpleObject, Default, Clone, Debug)]
pub(crate) struct WalkConnectionFields {
    pub(crate) total_count: i64,
    pub(crate) total_distance: i64,
    pub(crate) total_duration: i64,
}

#[derive(Debug, FromQueryResult)]
struct WalkStats {
    total_distance: Option<i64>,
    total_duration: Option<i64>,
}

pub(crate) async fn fetch_walk_stats(
    db: &DatabaseConnection,
    base_query: Select<walk::Entity>,
) -> Result<(i64, i64), DbErr> {
    let stats = base_query
        .filter(walk::Column::EndedAt.is_not_null())
        .select_only()
        .column_as(Expr::col(walk::Column::Distance).sum(), "total_distance")
        .column_as(
            Expr::cust("SUM(EXTRACT(EPOCH FROM (ended_at - started_at))::bigint)"),
            "total_duration",
        )
        .into_model::<WalkStats>()
        .one(db)
        .await?;

    let stats = stats.unwrap_or(WalkStats {
        total_distance: None,
        total_duration: None,
    });

    Ok((
        stats.total_distance.unwrap_or(0),
        stats.total_duration.unwrap_or(0),
    ))
}
