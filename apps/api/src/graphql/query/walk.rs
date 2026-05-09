use async_graphql::{
    Context, Object, Result,
    connection::{Connection, Edge, EmptyFields, query},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use uuid::Uuid;

use crate::graphql::{cursor::UuidCursor, error::AppError, guard::AuthGuard};
use crate::{
    entity::{user, walk},
    graphql::object::walk::Walk,
};

#[derive(Default, Debug)]
pub struct WalkQuery;

#[Object]
impl WalkQuery {
    #[graphql(guard = "AuthGuard")]
    async fn walks(
        &self,
        ctx: &Context<'_>,
        after: Option<String>,
        before: Option<String>,
        first: Option<i32>,
        last: Option<i32>,
    ) -> Result<Connection<UuidCursor, Walk, EmptyFields, EmptyFields>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();

        query(
            after,
            before,
            first,
            last,
            |after: Option<UuidCursor>, before: Option<UuidCursor>, first, last| async move {
                let has_after = after.is_some();
                let has_before = before.is_some();
                let mut walks_query = walk::Entity::find()
                    .filter(walk::Column::UserId.eq(user.id))
                    .order_by(walk::Column::Id, sea_orm::Order::Desc);

                if let Some(after) = after {
                    walks_query = walks_query.filter(walk::Column::Id.lt(after.id));
                }

                if let Some(before) = before {
                    walks_query = walks_query.filter(walk::Column::Id.gt(before.id));
                }

                let mut has_previous = has_after;
                let mut has_next = has_before;
                let mut walks = walks_query
                    .all(db)
                    .await
                    .map_err(|e| AppError::InternalServerError(e.to_string()))?;

                if let Some(first) = first {
                    if walks.len() > first {
                        has_next = true;
                    }
                    walks.truncate(first);
                }

                if let Some(last) = last {
                    if walks.len() > last {
                        has_previous = true;
                    }
                    walks = walks.split_off(walks.len().saturating_sub(last));
                }

                let mut connection = Connection::new(has_previous, has_next);
                connection.edges.extend(
                    walks
                        .into_iter()
                        .map(|walk| Edge::new(UuidCursor { id: walk.id }, Walk::from(walk))),
                );
                Ok::<_, async_graphql::Error>(connection)
            },
        )
        .await
    }

    #[graphql(guard = "AuthGuard")]
    async fn walk(&self, ctx: &Context<'_>, id: Uuid) -> Result<Walk> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let walk = walk::Entity::find_by_id(id)
            .filter(walk::Column::UserId.eq(user.id))
            .one(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?
            .ok_or_else(|| AppError::NotFound)?;
        Ok(Walk::from(walk))
    }
}
