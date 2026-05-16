use async_graphql::{
    ComplexObject, Context, Result, SimpleObject,
    connection::{Connection, Edge, EmptyFields, query},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use url::Url;
use uuid::Uuid;

use crate::{
    entity::{dog, user, user_dog, walk},
    graphql::{
        cursor::UuidCursor,
        error::AppError,
        object::{dog::Dog, walk::Walk, walk_connection::WalkConnectionFields},
    },
    util::storage::avatar_url,
};

#[derive(SimpleObject, Clone, Debug)]
#[graphql(complex)]
pub struct User {
    pub id: Uuid,
    pub name: Option<String>,
    pub avatar: Option<Url>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[ComplexObject]
impl User {
    async fn dogs(&self, ctx: &Context<'_>) -> Result<Vec<Dog>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let dogs = dog::Entity::find()
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(self.id))
            .order_by(dog::Column::Name, sea_orm::Order::Asc)
            .all(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(dogs.into_iter().map(Dog::from).collect())
    }

    async fn walks(
        &self,
        ctx: &Context<'_>,
        after: Option<String>,
        before: Option<String>,
        first: Option<i32>,
        last: Option<i32>,
    ) -> Result<Connection<UuidCursor, Walk, WalkConnectionFields, EmptyFields>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        query(
            after,
            before,
            first,
            last,
            |after: Option<UuidCursor>, before: Option<UuidCursor>, first, last| async move {
                let mut query = walk::Entity::find().filter(walk::Column::UserId.eq(user.id));
                let (total_count, total_distance, total_duration) =
                    walk::Entity::aggregate(db, query.clone()).await?;
                let has_after = after.is_some();
                let has_before = before.is_some();
                query = query.order_by(walk::Column::Id, sea_orm::Order::Desc);
                if let Some(after) = after {
                    query = query.filter(walk::Column::Id.lt(after.id));
                }
                if let Some(before) = before {
                    query = query.filter(walk::Column::Id.gt(before.id));
                }
                let mut has_previous = has_after;
                let mut has_next = has_before;
                let mut walks = query.all(db).await?;
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
                let mut connection = Connection::with_additional_fields(
                    has_previous,
                    has_next,
                    WalkConnectionFields {
                        total_count,
                        total_distance,
                        total_duration,
                    },
                );
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
}

impl From<user::Model> for User {
    fn from(model: user::Model) -> Self {
        User {
            id: model.id,
            name: model.name,
            avatar: avatar_url(model.avatar.as_deref()),
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
