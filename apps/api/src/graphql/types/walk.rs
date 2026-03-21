use async_graphql::{Context, Object, Result, SimpleObject, ID};
use std::sync::Arc;
use crate::AppState;
use crate::services::dog_service;

#[derive(SimpleObject, Clone, Debug)]
pub struct WalkPoint {
    pub lat: f64,
    pub lng: f64,
    pub recorded_at: String,
}

pub struct Walk {
    pub id: uuid::Uuid,
    pub user_id: uuid::Uuid,
    pub status: String,
    pub distance_m: Option<i32>,
    pub duration_sec: Option<i32>,
    pub started_at: chrono::DateTime<chrono::FixedOffset>,
    pub ended_at: Option<chrono::DateTime<chrono::FixedOffset>>,
}

#[Object]
impl Walk {
    async fn id(&self) -> ID {
        ID(self.id.to_string())
    }

    async fn status(&self) -> &str {
        &self.status
    }

    async fn distance_m(&self) -> Option<i32> {
        self.distance_m
    }

    async fn duration_sec(&self) -> Option<i32> {
        self.duration_sec
    }

    async fn started_at(&self) -> String {
        self.started_at.to_rfc3339()
    }

    async fn ended_at(&self) -> Option<String> {
        self.ended_at.map(|t| t.to_rfc3339())
    }

    async fn dogs(&self, ctx: &Context<'_>) -> Result<Vec<super::dog::Dog>> {
        let state = ctx.data::<Arc<AppState>>()?;
        let dogs = dog_service::get_dogs_by_walk_id(&state.db, self.id).await?;
        Ok(dogs)
    }

    /// Stub: implemented in Task 10
    async fn points(&self, _ctx: &Context<'_>) -> Result<Vec<WalkPoint>> {
        Ok(vec![])
    }
}

impl From<crate::entities::walks::Model> for Walk {
    fn from(m: crate::entities::walks::Model) -> Self {
        Self {
            id: m.id,
            user_id: m.user_id,
            status: m.status,
            distance_m: m.distance_m,
            duration_sec: m.duration_sec,
            started_at: m.started_at.into(),
            ended_at: m.ended_at.map(|t| t.into()),
        }
    }
}
