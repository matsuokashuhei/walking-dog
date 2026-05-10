use async_graphql::{
    ComplexObject, Context, Enum, Result, SimpleObject,
    connection::{Connection, Edge, EmptyFields, query},
};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder};
use url::Url;

use crate::{
    entity::{sea_orm_active_enums::GenderType, user, walk, walk_dog},
    graphql::cursor::{WalkConnectionFields, UuidCursor, fetch_walk_stats},
    graphql::object::walk::Walk,
    storage::avatar_url,
};

#[derive(Enum, Debug, Copy, Clone, Eq, PartialEq)]
pub enum Gender {
    Male,
    Female,
    Other,
}

impl From<GenderType> for Gender {
    fn from(gender_type: GenderType) -> Self {
        match gender_type {
            GenderType::Male => Gender::Male,
            GenderType::Female => Gender::Female,
            GenderType::Other => Gender::Other,
        }
    }
}

/// 飼い主が知っている範囲だけ埋められる、ゆるい誕生日（年・月・日 すべて任意）。
#[derive(SimpleObject, Clone, Debug)]
pub struct Birthday {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

impl From<crate::entity::birthday::Birthday> for Birthday {
    fn from(value: crate::entity::birthday::Birthday) -> Self {
        Birthday {
            year: value.year,
            month: value.month,
            day: value.day,
        }
    }
}

#[derive(SimpleObject, Clone, Debug)]
#[graphql(complex)]
pub struct Dog {
    pub id: uuid::Uuid,
    pub name: String,
    pub breed: Option<String>,
    pub gender: Gender,
    pub avatar: Option<Url>,
    pub birthday: Option<Birthday>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[ComplexObject]
impl Dog {
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
                let total_count = walk::Entity::find()
                    .filter(walk::Column::UserId.eq(user.id))
                    .has_related(walk_dog::Entity, walk_dog::Column::DogId.eq(self.id))
                    .count(db)
                    .await? as i64;
                let stats_query = walk::Entity::find()
                    .filter(walk::Column::UserId.eq(user.id))
                    .has_related(walk_dog::Entity, walk_dog::Column::DogId.eq(self.id));
                let (total_distance, total_duration) =
                    fetch_walk_stats(db, stats_query).await?;
                let has_after = after.is_some();
                let has_before = before.is_some();
                let mut query = walk::Entity::find()
                    .filter(walk::Column::UserId.eq(user.id))
                    .has_related(walk_dog::Entity, walk_dog::Column::DogId.eq(self.id))
                    .order_by(walk::Column::Id, sea_orm::Order::Desc);
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

impl From<crate::entity::dog::Model> for Dog {
    fn from(model: crate::entity::dog::Model) -> Self {
        Dog {
            id: model.id,
            name: model.name,
            breed: model.breed,
            gender: model.gender.into(),
            avatar: avatar_url(model.avatar.as_deref()),
            birthday: model.birthday.map(Into::into),
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
