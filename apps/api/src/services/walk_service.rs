use crate::entities::{
    walk_dogs::{self, ActiveModel as WalkDogActiveModel, Entity as WalkDogEntity},
    walks::{self, ActiveModel, Entity as WalkEntity, Model as WalkModel},
};
use crate::error::AppError;
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
    TransactionTrait,
};
use uuid::Uuid;

pub struct WalkStats {
    pub total_walks: i32,
    pub total_distance_m: i32,
    pub total_duration_sec: i32,
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
        status: Set("active".to_string()),
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

    if walk.status != "active" {
        return Err(AppError::BadRequest(format!(
            "Walk is not active (current status: {})",
            walk.status
        )));
    }

    let started_at: chrono::DateTime<chrono::Utc> = walk.started_at.into();
    let ended_at = Utc::now();
    let duration_sec = (ended_at - started_at).num_seconds() as i32;

    let mut active: walks::ActiveModel = walk.into();
    active.status = Set("finished".to_string());
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
    let now = Utc::now();
    let since: Option<chrono::DateTime<chrono::Utc>> = match period {
        "Week" => Some(now - chrono::Duration::weeks(1)),
        "Month" => Some(now - chrono::Duration::days(30)),
        "Year" => Some(now - chrono::Duration::days(365)),
        _ => None, // "All" or unknown
    };

    let walk_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::DogId.eq(dog_id))
        .select_only()
        .column(walk_dogs::Column::WalkId)
        .into_tuple()
        .all(db)
        .await?;

    let mut query = WalkEntity::find()
        .filter(walks::Column::Id.is_in(walk_ids))
        .filter(walks::Column::Status.eq("finished"));

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
}
