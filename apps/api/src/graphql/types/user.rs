use async_graphql::{Context, Object, Result, ID};
use std::sync::Arc;
use crate::AppState;
use crate::services::dog_service;

pub struct User {
    pub id: uuid::Uuid,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
}

#[Object]
impl User {
    async fn id(&self) -> ID {
        ID(self.id.to_string())
    }

    async fn display_name(&self) -> Option<&str> {
        self.display_name.as_deref()
    }

    async fn avatar_url(&self) -> Option<&str> {
        self.avatar_url.as_deref()
    }

    async fn created_at(&self) -> String {
        self.created_at.to_rfc3339()
    }

    async fn dogs(&self, ctx: &Context<'_>) -> Result<Vec<super::dog::Dog>> {
        let state = ctx.data::<Arc<AppState>>()?;
        let dogs = dog_service::get_dogs_by_user_id(&state.db, self.id).await?;
        Ok(dogs)
    }
}

impl From<crate::entities::users::Model> for User {
    fn from(m: crate::entities::users::Model) -> Self {
        Self {
            id: m.id,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
            created_at: m.created_at.into(),
        }
    }
}
