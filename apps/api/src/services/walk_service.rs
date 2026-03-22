use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use uuid::Uuid;
use chrono::Utc;
use crate::entities::{
    walks::{self, ActiveModel, Entity as WalkEntity, Model as WalkModel},
    walk_dogs::{self, ActiveModel as WalkDogActiveModel, Entity as WalkDogEntity},
};
use crate::error::AppError;

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

    let walk = ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        status: Set("active".to_string()),
        started_at: Set(Utc::now().into()),
        ..Default::default()
    }
    .insert(db)
    .await?;

    for dog_id in dog_ids {
        WalkDogActiveModel {
            walk_id: Set(walk.id),
            dog_id: Set(dog_id),
        }
        .insert(db)
        .await?;
    }

    Ok(walk)
}

pub async fn finish_walk(
    db: &sea_orm::DatabaseConnection,
    walk_id: Uuid,
    user_id: Uuid,
) -> Result<WalkModel, AppError> {
    let walk = WalkEntity::find_by_id(walk_id)
        .filter(walks::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Walk {} not found", walk_id)))?;

    if walk.status != "active" {
        return Err(AppError::BadRequest(
            format!("Walk is not active (current status: {})", walk.status)
        ));
    }

    let started_at: chrono::DateTime<chrono::Utc> = walk.started_at.into();
    let ended_at = Utc::now();
    let duration_sec = (ended_at - started_at).num_seconds() as i32;

    let mut active: walks::ActiveModel = walk.into();
    active.status = Set("finished".to_string());
    active.ended_at = Set(Some(ended_at.into()));
    active.duration_sec = Set(Some(duration_sec));

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

    Ok(WalkStats { total_walks, total_distance_m, total_duration_sec })
}

pub async fn get_walks_by_user_id(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<Vec<WalkModel>, AppError> {
    let mut query = WalkEntity::find()
        .filter(walks::Column::UserId.eq(user_id))
        .order_by_desc(walks::Column::StartedAt);
    if let Some(l) = limit {
        query = query.limit(l);
    }
    if let Some(o) = offset {
        query = query.offset(o);
    }
    let walks = query.all(db).await?;
    Ok(walks)
}
