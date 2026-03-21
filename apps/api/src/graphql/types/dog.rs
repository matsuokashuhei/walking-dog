use async_graphql::{Context, InputObject, Object, Result, SimpleObject, ID};
use std::sync::Arc;
use crate::AppState;

#[derive(SimpleObject, Clone, Debug)]
pub struct BirthDate {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct WalkStats {
    pub total_walks: i32,
    pub total_distance_m: i32,
    pub total_duration_sec: i32,
}

#[derive(InputObject, Clone, Debug)]
pub struct BirthDateInput {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

impl BirthDateInput {
    pub fn to_json(&self) -> serde_json::Value {
        let mut map = serde_json::Map::new();
        if let Some(y) = self.year {
            map.insert("year".into(), y.into());
        }
        if let Some(m) = self.month {
            map.insert("month".into(), m.into());
        }
        if let Some(d) = self.day {
            map.insert("day".into(), d.into());
        }
        serde_json::Value::Object(map)
    }
}

impl BirthDate {
    pub fn from_json(v: &serde_json::Value) -> Option<Self> {
        Some(Self {
            year: v.get("year").and_then(|v| v.as_i64()).map(|v| v as i32),
            month: v.get("month").and_then(|v| v.as_i64()).map(|v| v as i32),
            day: v.get("day").and_then(|v| v.as_i64()).map(|v| v as i32),
        })
    }
}

#[derive(async_graphql::Enum, Clone, Copy, PartialEq, Eq, Debug)]
pub enum StatsPeriod {
    Week,
    Month,
    Year,
    All,
}

pub struct Dog {
    pub id: uuid::Uuid,
    pub user_id: uuid::Uuid,
    pub name: String,
    pub breed: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<BirthDate>,
    pub photo_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
}

#[Object]
impl Dog {
    async fn id(&self) -> ID {
        ID(self.id.to_string())
    }

    async fn name(&self) -> &str {
        &self.name
    }

    async fn breed(&self) -> Option<&str> {
        self.breed.as_deref()
    }

    async fn gender(&self) -> Option<&str> {
        self.gender.as_deref()
    }

    async fn birth_date(&self) -> Option<&BirthDate> {
        self.birth_date.as_ref()
    }

    async fn photo_url(&self) -> Option<&str> {
        self.photo_url.as_deref()
    }

    async fn created_at(&self) -> String {
        self.created_at.to_rfc3339()
    }

    async fn walks(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<super::walk::Walk>> {
        let state = ctx.data::<Arc<AppState>>()?;
        let walks = crate::services::walk_service::get_walks_by_dog_id(
            &state.db,
            self.id,
            limit.unwrap_or(20) as u64,
            offset.unwrap_or(0) as u64,
        ).await?;
        Ok(walks)
    }

    /// Stub: implemented in Task 11
    async fn walk_stats(
        &self,
        _ctx: &Context<'_>,
        _period: StatsPeriod,
    ) -> Result<WalkStats> {
        Ok(WalkStats {
            total_walks: 0,
            total_distance_m: 0,
            total_duration_sec: 0,
        })
    }
}

impl From<crate::entities::dogs::Model> for Dog {
    fn from(m: crate::entities::dogs::Model) -> Self {
        let birth_date = m.birth_date.as_ref().and_then(BirthDate::from_json);
        Self {
            id: m.id,
            user_id: m.user_id,
            name: m.name,
            breed: m.breed,
            gender: m.gender,
            birth_date,
            photo_url: m.photo_url,
            created_at: m.created_at.into(),
        }
    }
}
