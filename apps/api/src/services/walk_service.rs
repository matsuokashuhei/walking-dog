use crate::entities::{
    walk_dogs::{self, ActiveModel as WalkDogActiveModel, Entity as WalkDogEntity},
    walks::{self, ActiveModel, Entity as WalkEntity, Model as WalkModel, WalkStatus},
};
use crate::error::AppError;
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
    TransactionTrait,
};
use std::fmt;
use std::str::FromStr;
use uuid::Uuid;

pub struct WalkStats {
    pub total_walks: i32,
    pub total_distance_m: i32,
    pub total_duration_sec: i32,
}

/// Time period for walk statistics queries.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Period {
    Week,
    Month,
    Year,
    All,
}

impl fmt::Display for Period {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Period::Week => write!(f, "Week"),
            Period::Month => write!(f, "Month"),
            Period::Year => write!(f, "Year"),
            Period::All => write!(f, "All"),
        }
    }
}

impl FromStr for Period {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Week" => Ok(Period::Week),
            "Month" => Ok(Period::Month),
            "Year" => Ok(Period::Year),
            "All" => Ok(Period::All),
            other => Err(format!("Invalid Period: '{}'", other)),
        }
    }
}

impl Period {
    /// Returns the cutoff duration for this period, or `None` for `All`.
    pub fn since(&self) -> Option<chrono::DateTime<Utc>> {
        let now = Utc::now();
        match self {
            Period::Week => Some(now - chrono::Duration::weeks(1)),
            Period::Month => Some(now - chrono::Duration::days(30)),
            Period::Year => Some(now - chrono::Duration::days(365)),
            Period::All => None,
        }
    }
}

pub async fn start_walk(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    dog_ids: Vec<Uuid>,
) -> Result<WalkModel, AppError> {
    if dog_ids.is_empty() {
        return Err(AppError::BadRequest("dogIds must not be empty".to_string()));
    }

    let txn = db.begin().await?;

    let walk = ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        status: Set(WalkStatus::Active),
        started_at: Set(Utc::now().into()),
        ..Default::default()
    }
    .insert(&txn)
    .await?;

    for dog_id in dog_ids {
        WalkDogActiveModel {
            walk_id: Set(walk.id),
            dog_id: Set(dog_id),
        }
        .insert(&txn)
        .await?;
    }

    txn.commit().await?;
    Ok(walk)
}

pub async fn finish_walk(
    db: &sea_orm::DatabaseConnection,
    walk_id: Uuid,
    user_id: Uuid,
    distance_m: Option<i32>,
) -> Result<WalkModel, AppError> {
    let walk = WalkEntity::find_by_id(walk_id)
        .filter(walks::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Walk {} not found", walk_id)))?;

    if walk.status != WalkStatus::Active {
        return Err(AppError::BadRequest(format!(
            "Walk is not active (current status: {})",
            walk.status
        )));
    }

    let started_at: chrono::DateTime<chrono::Utc> = walk.started_at.into();
    let ended_at = Utc::now();
    let duration_sec = (ended_at - started_at).num_seconds() as i32;

    let mut active: walks::ActiveModel = walk.into();
    active.status = Set(WalkStatus::Finished);
    active.ended_at = Set(Some(ended_at.into()));
    active.duration_sec = Set(Some(duration_sec));
    active.distance_m = Set(distance_m);

    let updated = active.update(db).await?;
    Ok(updated)
}

pub async fn get_walk_stats(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
    period: &str,
) -> Result<WalkStats, AppError> {
    let period: Period = period.parse().unwrap_or(Period::All);
    let since = period.since();

    let walk_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::DogId.eq(dog_id))
        .select_only()
        .column(walk_dogs::Column::WalkId)
        .into_tuple()
        .all(db)
        .await?;

    let mut query = WalkEntity::find()
        .filter(walks::Column::Id.is_in(walk_ids))
        .filter(walks::Column::Status.eq(WalkStatus::Finished));

    if let Some(s) = since {
        query = query.filter(walks::Column::StartedAt.gte(s));
    }

    let walks = query.all(db).await?;

    let total_walks = walks.len() as i32;
    let total_distance_m = walks.iter().filter_map(|w| w.distance_m).sum();
    let total_duration_sec = walks.iter().filter_map(|w| w.duration_sec).sum();

    Ok(WalkStats {
        total_walks,
        total_distance_m,
        total_duration_sec,
    })
}

/// Get the most recent finished walk for a given dog, or `None` when the dog
/// has no completed walks yet. Drives `DogOutput.latestWalk` for the
/// "Last walk Xh ago" label on the Walk Ready screen.
pub async fn get_latest_finished_walk_for_dog(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
) -> Result<Option<WalkModel>, AppError> {
    let walk_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::DogId.eq(dog_id))
        .select_only()
        .column(walk_dogs::Column::WalkId)
        .into_tuple()
        .all(db)
        .await?;

    if walk_ids.is_empty() {
        return Ok(None);
    }

    let walk = WalkEntity::find()
        .filter(walks::Column::Id.is_in(walk_ids))
        .filter(walks::Column::Status.eq(WalkStatus::Finished))
        .order_by_desc(walks::Column::EndedAt)
        .one(db)
        .await?;

    Ok(walk)
}

/// Get walks for a user. Returns walks the user recorded (walks.user_id)
/// plus walks by other members of the user's shared dogs.
pub async fn get_walks_for_user(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<Vec<WalkModel>, AppError> {
    use crate::entities::dog_members::{self, Entity as DogMemberEntity};

    // Find all dog IDs the user is a member of
    let dog_ids: Vec<Uuid> = DogMemberEntity::find()
        .filter(dog_members::Column::UserId.eq(user_id))
        .select_only()
        .column(dog_members::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    // Find all walk IDs for those dogs
    let walk_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::DogId.is_in(dog_ids))
        .select_only()
        .column(walk_dogs::Column::WalkId)
        .into_tuple()
        .all(db)
        .await?;

    let mut query = WalkEntity::find()
        .filter(walks::Column::Id.is_in(walk_ids))
        .order_by_desc(walks::Column::StartedAt);

    if let Some(o) = offset {
        query = query.offset(o);
    }
    if let Some(l) = limit {
        query = query.limit(l);
    }

    let walks = query.all(db).await?;
    Ok(walks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn period_from_str_week() {
        let p: Period = "Week".parse().unwrap();
        assert_eq!(p, Period::Week);
    }

    #[test]
    fn period_from_str_month() {
        let p: Period = "Month".parse().unwrap();
        assert_eq!(p, Period::Month);
    }

    #[test]
    fn period_from_str_year() {
        let p: Period = "Year".parse().unwrap();
        assert_eq!(p, Period::Year);
    }

    #[test]
    fn period_from_str_all() {
        let p: Period = "All".parse().unwrap();
        assert_eq!(p, Period::All);
    }

    #[test]
    fn period_from_str_invalid_returns_error() {
        let result: Result<Period, _> = "invalid".parse();
        assert!(result.is_err());
    }

    #[test]
    fn period_to_string_roundtrip() {
        for period in [Period::Week, Period::Month, Period::Year, Period::All] {
            let s = period.to_string();
            let back: Period = s.parse().unwrap();
            assert_eq!(back, period);
        }
    }

    // ─── MockDatabase unit tests ─────────────────────────────────────────────

    use sea_orm::{DatabaseBackend, MockDatabase};

    fn make_walk_dog(walk_id: Uuid, dog_id: Uuid) -> crate::entities::walk_dogs::Model {
        crate::entities::walk_dogs::Model { walk_id, dog_id }
    }

    fn make_finished_walk(
        id: Uuid,
        user_id: Uuid,
        distance_m: Option<i32>,
        duration_sec: Option<i32>,
    ) -> crate::entities::walks::Model {
        use crate::entities::walks::WalkStatus;
        use chrono::Utc;
        crate::entities::walks::Model {
            id,
            user_id,
            status: WalkStatus::Finished,
            distance_m,
            duration_sec,
            started_at: Utc::now().into(),
            ended_at: Some(Utc::now().into()),
        }
    }

    #[tokio::test]
    async fn get_walk_stats_returns_zeros_when_no_walks() {
        let dog_id = Uuid::new_v4();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([Vec::<crate::entities::walk_dogs::Model>::new()])
            .append_query_results([Vec::<crate::entities::walks::Model>::new()])
            .into_connection();

        let stats = get_walk_stats(&db, dog_id, "All").await.unwrap();
        assert_eq!(stats.total_walks, 0);
        assert_eq!(stats.total_distance_m, 0);
        assert_eq!(stats.total_duration_sec, 0);
    }

    #[tokio::test]
    async fn get_walk_stats_sums_distance_and_duration() {
        let dog_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let walk_id = Uuid::new_v4();
        let walk_dogs_row = make_walk_dog(walk_id, dog_id);
        let walk = make_finished_walk(walk_id, user_id, Some(500), Some(1200));
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![walk_dogs_row]])
            .append_query_results([vec![walk]])
            .into_connection();

        let stats = get_walk_stats(&db, dog_id, "All").await.unwrap();
        assert_eq!(stats.total_walks, 1);
        assert_eq!(stats.total_distance_m, 500);
        assert_eq!(stats.total_duration_sec, 1200);
    }

    #[tokio::test]
    async fn get_latest_finished_walk_for_dog_returns_none_when_no_walks() {
        let dog_id = Uuid::new_v4();
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([Vec::<crate::entities::walk_dogs::Model>::new()])
            .into_connection();

        let walk = get_latest_finished_walk_for_dog(&db, dog_id).await.unwrap();
        assert!(walk.is_none());
    }

    #[tokio::test]
    async fn get_latest_finished_walk_for_dog_returns_most_recent() {
        let dog_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let walk_id = Uuid::new_v4();
        let walk_dogs_row = make_walk_dog(walk_id, dog_id);
        let walk = make_finished_walk(walk_id, user_id, Some(1000), Some(1800));
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![walk_dogs_row]])
            .append_query_results([vec![walk.clone()]])
            .into_connection();

        let result = get_latest_finished_walk_for_dog(&db, dog_id).await.unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().id, walk_id);
    }

    #[tokio::test]
    async fn get_walk_stats_handles_null_distance_and_duration() {
        let dog_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let walk_id = Uuid::new_v4();
        let walk_dogs_row = make_walk_dog(walk_id, dog_id);
        let walk = make_finished_walk(walk_id, user_id, None, None);
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![walk_dogs_row]])
            .append_query_results([vec![walk]])
            .into_connection();

        let stats = get_walk_stats(&db, dog_id, "All").await.unwrap();
        assert_eq!(stats.total_walks, 1);
        assert_eq!(stats.total_distance_m, 0);
        assert_eq!(stats.total_duration_sec, 0);
    }
}
