use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, TransactionTrait,
};
use uuid::Uuid;

use crate::{
    entity::{dog_walk_goal, walk_amount},
    service::{
        dog as dog_service,
        error::{ServiceError, ServiceResult, map_transaction_error},
    },
};

pub const MIN_DAILY_GOAL_MINUTES: i32 = 10;
pub const MAX_DAILY_GOAL_MINUTES: i32 = 120;
pub const DAILY_GOAL_CYCLE_DAYS: i32 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DailyGoalUpsertPlan {
    Insert {
        minutes: i32,
    },
    UpdateCurrent {
        minutes: i32,
    },
    ReplaceCurrent {
        close_existing_to: chrono::NaiveDate,
        minutes: i32,
    },
    Noop,
}

pub fn validate_daily_goal_minutes(minutes: i32) -> ServiceResult<i32> {
    if !(MIN_DAILY_GOAL_MINUTES..=MAX_DAILY_GOAL_MINUTES).contains(&minutes) {
        return Err(ServiceError::UnprocessableEntity(
            "dailyGoalMinutes must be between 10 and 120".into(),
        ));
    }
    Ok(minutes)
}

pub fn validate_walk_amount(input: &walk_amount::Model) -> ServiceResult<()> {
    if input.minutes <= 0 {
        return Err(ServiceError::UnprocessableEntity(
            "walkAmount.minutes must be > 0".into(),
        ));
    }
    if input.cycle_days < 1 {
        return Err(ServiceError::UnprocessableEntity(
            "walkAmount.cycleDays must be >= 1".into(),
        ));
    }
    Ok(())
}

pub fn plan_daily_goal_upsert(
    current: Option<&dog_walk_goal::Model>,
    minutes: i32,
    today: chrono::NaiveDate,
) -> ServiceResult<DailyGoalUpsertPlan> {
    validate_daily_goal_minutes(minutes)?;

    let Some(current) = current else {
        return Ok(DailyGoalUpsertPlan::Insert { minutes });
    };

    if current.walk_amount.minutes == minutes
        && current.walk_amount.cycle_days == DAILY_GOAL_CYCLE_DAYS
    {
        return Ok(DailyGoalUpsertPlan::Noop);
    }

    if current.effective_from == today {
        return Ok(DailyGoalUpsertPlan::UpdateCurrent { minutes });
    }

    if current.effective_from < today {
        return Ok(DailyGoalUpsertPlan::ReplaceCurrent {
            close_existing_to: today.pred_opt().ok_or_else(|| {
                ServiceError::UnprocessableEntity("today cannot be the minimum date".into())
            })?,
            minutes,
        });
    }

    Err(ServiceError::UnprocessableEntity(
        "current daily goal cannot start in the future".into(),
    ))
}

pub async fn upsert_daily_goal<C>(
    db: &C,
    dog_id: Uuid,
    minutes: i32,
    today: chrono::NaiveDate,
) -> ServiceResult<()>
where
    C: ConnectionTrait,
{
    let current = dog_walk_goal::Entity::find()
        .filter(dog_walk_goal::Column::DogId.eq(dog_id))
        .filter(dog_walk_goal::Column::EffectiveTo.is_null())
        .one(db)
        .await?;

    let plan = plan_daily_goal_upsert(current.as_ref(), minutes, today)?;
    match plan {
        DailyGoalUpsertPlan::Noop => {}
        DailyGoalUpsertPlan::Insert { minutes } => {
            insert_daily_goal(db, dog_id, minutes, today).await?;
        }
        DailyGoalUpsertPlan::UpdateCurrent { minutes } => {
            let Some(current) = current else {
                return Err(ServiceError::NotFound);
            };
            let mut active: dog_walk_goal::ActiveModel = current.into();
            active.walk_amount = Set(walk_amount::Model {
                minutes,
                cycle_days: DAILY_GOAL_CYCLE_DAYS,
            });
            active.updated_at = Set(chrono::Utc::now().into());
            active.update(db).await?;
        }
        DailyGoalUpsertPlan::ReplaceCurrent {
            close_existing_to,
            minutes,
        } => {
            let Some(current) = current else {
                return Err(ServiceError::NotFound);
            };
            let mut active: dog_walk_goal::ActiveModel = current.into();
            active.effective_to = Set(Some(close_existing_to));
            active.updated_at = Set(chrono::Utc::now().into());
            active.update(db).await?;
            insert_daily_goal(db, dog_id, minutes, today).await?;
        }
    }

    Ok(())
}

pub async fn set_goal_for_user(
    db: &DatabaseConnection,
    user_id: Uuid,
    dog_id: Uuid,
    walk_amount: walk_amount::Model,
    effective_from: chrono::NaiveDate,
    today: chrono::NaiveDate,
) -> ServiceResult<dog_walk_goal::Model> {
    db.transaction::<_, dog_walk_goal::Model, ServiceError>(|txn| {
        let walk_amount = walk_amount.clone();
        Box::pin(async move {
            dog_service::ensure_owned(txn, user_id, dog_id).await?;
            set_goal(txn, dog_id, walk_amount, effective_from, today).await
        })
    })
    .await
    .map_err(map_transaction_error)
}

pub async fn edit_current_goal_for_user(
    db: &DatabaseConnection,
    user_id: Uuid,
    dog_id: Uuid,
    walk_amount: walk_amount::Model,
) -> ServiceResult<dog_walk_goal::Model> {
    dog_service::ensure_owned(db, user_id, dog_id).await?;
    edit_current_goal(db, dog_id, walk_amount).await
}

async fn set_goal<C>(
    db: &C,
    dog_id: Uuid,
    walk_amount: walk_amount::Model,
    effective_from: chrono::NaiveDate,
    today: chrono::NaiveDate,
) -> ServiceResult<dog_walk_goal::Model>
where
    C: ConnectionTrait,
{
    validate_walk_amount(&walk_amount)?;
    if effective_from > today {
        return Err(ServiceError::UnprocessableEntity(
            "effectiveFrom cannot be in the future".into(),
        ));
    }

    let previous = dog_walk_goal::Entity::find()
        .filter(dog_walk_goal::Column::DogId.eq(dog_id))
        .filter(dog_walk_goal::Column::EffectiveTo.is_null())
        .one(db)
        .await?;
    if let Some(prev) = previous {
        if effective_from <= prev.effective_from {
            return Err(ServiceError::UnprocessableEntity(
                "effectiveFrom must be after the current goal's effective_from".into(),
            ));
        }
        let mut prev_active: dog_walk_goal::ActiveModel = prev.into();
        prev_active.effective_to = Set(Some(effective_from.pred_opt().ok_or_else(|| {
            ServiceError::UnprocessableEntity("effectiveFrom cannot be the minimum date".into())
        })?));
        prev_active.update(db).await?;
    }

    dog_walk_goal::ActiveModel {
        dog_id: Set(dog_id),
        walk_amount: Set(walk_amount),
        effective_from: Set(effective_from),
        effective_to: Set(None),
        ..Default::default()
    }
    .insert(db)
    .await
    .map_err(ServiceError::from)
}

async fn edit_current_goal<C>(
    db: &C,
    dog_id: Uuid,
    walk_amount: walk_amount::Model,
) -> ServiceResult<dog_walk_goal::Model>
where
    C: ConnectionTrait,
{
    validate_walk_amount(&walk_amount)?;

    let goal = dog_walk_goal::Entity::find()
        .filter(dog_walk_goal::Column::DogId.eq(dog_id))
        .filter(dog_walk_goal::Column::EffectiveTo.is_null())
        .one(db)
        .await?
        .ok_or(ServiceError::NotFound)?;

    let mut active: dog_walk_goal::ActiveModel = goal.into();
    active.walk_amount = Set(walk_amount);
    active.update(db).await.map_err(ServiceError::from)
}

async fn insert_daily_goal<C>(
    db: &C,
    dog_id: Uuid,
    minutes: i32,
    effective_from: chrono::NaiveDate,
) -> ServiceResult<dog_walk_goal::Model>
where
    C: ConnectionTrait,
{
    dog_walk_goal::ActiveModel {
        dog_id: Set(dog_id),
        walk_amount: Set(walk_amount::Model {
            minutes,
            cycle_days: DAILY_GOAL_CYCLE_DAYS,
        }),
        effective_from: Set(effective_from),
        effective_to: Set(None),
        ..Default::default()
    }
    .insert(db)
    .await
    .map_err(ServiceError::from)
}
