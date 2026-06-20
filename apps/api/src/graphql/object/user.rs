use async_graphql::{
    ComplexObject, Context, Result, SimpleObject,
    connection::{Connection, Edge, EmptyFields, query},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryOrder};
use url::Url;
use uuid::Uuid;

use crate::{
    entity::{dog, user, user_dog},
    graphql::{
        AuthAccessToken,
        cursor::UuidCursor,
        error::AppError,
        object::{dog::Dog, walk::Walk, walk_connection::WalkConnectionFields},
    },
    service::{
        auth::SharedAuthGateway,
        storage::avatar_url_from_env as avatar_url,
        walk_read_model::{self, WalkHistoryRequest},
    },
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
    async fn email(&self, ctx: &Context<'_>) -> Result<String> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let authorization = ctx
            .data::<AuthAccessToken>()
            .map_err(|_| AppError::Unauthorized)?;
        auth_gateway
            .current_email(authorization.token())
            .await
            .map_err(crate::graphql::error::AuthError::from)
            .map_err(Into::into)
    }

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
                let page = walk_read_model::user_walk_history(
                    db,
                    user.id,
                    WalkHistoryRequest {
                        after: after.map(|cursor| cursor.id),
                        before: before.map(|cursor| cursor.id),
                        first,
                        last,
                    },
                )
                .await
                .map_err(AppError::from)?;
                let mut connection = Connection::with_additional_fields(
                    page.has_previous,
                    page.has_next,
                    WalkConnectionFields {
                        total_count: page.total_count,
                        total_distance: page.total_distance,
                        total_duration: page.total_duration,
                    },
                );
                connection.edges.extend(
                    page.walks
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
