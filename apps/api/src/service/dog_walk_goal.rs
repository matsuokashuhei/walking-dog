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
pub const WEEKLY_GOAL_CYCLE_DAYS: i32 = 7;
pub const MIN_WEEKLY_GOAL_MINUTES: i32 = MIN_DAILY_GOAL_MINUTES * WEEKLY_GOAL_CYCLE_DAYS;
pub const MAX_WEEKLY_GOAL_MINUTES: i32 = MAX_DAILY_GOAL_MINUTES * WEEKLY_GOAL_CYCLE_DAYS;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GoalUpsertPlan {
    Insert {
        walk_amount: walk_amount::Model,
    },
    UpdateCurrent {
        walk_amount: walk_amount::Model,
    },
    ReplaceCurrent {
        close_existing_to: chrono::NaiveDate,
        walk_amount: walk_amount::Model,
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

pub fn validate_goal_walk_amount(input: &walk_amount::Model) -> ServiceResult<walk_amount::Model> {
    match input.cycle_days {
        DAILY_GOAL_CYCLE_DAYS => {
            if !(MIN_DAILY_GOAL_MINUTES..=MAX_DAILY_GOAL_MINUTES).contains(&input.minutes) {
                return Err(ServiceError::UnprocessableEntity(
                    "walkGoal.minutes must be between 10 and 120 for DAILY".into(),
                ));
            }
        }
        WEEKLY_GOAL_CYCLE_DAYS => {
            if !(MIN_WEEKLY_GOAL_MINUTES..=MAX_WEEKLY_GOAL_MINUTES).contains(&input.minutes) {
                return Err(ServiceError::UnprocessableEntity(
                    "walkGoal.minutes must be between 70 and 840 for WEEKLY".into(),
                ));
            }
        }
        _ => {
            return Err(ServiceError::UnprocessableEntity(
                "walkGoal.cycleDays must be 1 or 7".into(),
            ));
        }
    }
    Ok(input.clone())
}

pub fn validate_walk_amount(input: &walk_amount::Model) -> ServiceResult<()> {
    validate_goal_walk_amount(input)?;
    Ok(())
}

pub fn plan_goal_upsert(
    current: Option<&dog_walk_goal::Model>,
    walk_amount: walk_amount::Model,
    today: chrono::NaiveDate,
) -> ServiceResult<GoalUpsertPlan> {
    let walk_amount = validate_goal_walk_amount(&walk_amount)?;

    let Some(current) = current else {
        return Ok(GoalUpsertPlan::Insert { walk_amount });
    };

    if current.walk_amount == walk_amount {
        return Ok(GoalUpsertPlan::Noop);
    }

    if current.effective_from == today {
        return Ok(GoalUpsertPlan::UpdateCurrent { walk_amount });
    }

    if current.effective_from < today {
        return Ok(GoalUpsertPlan::ReplaceCurrent {
            close_existing_to: today.pred_opt().ok_or_else(|| {
                ServiceError::UnprocessableEntity("today cannot be the minimum date".into())
            })?,
            walk_amount,
        });
    }

    Err(ServiceError::UnprocessableEntity(
        "current daily goal cannot start in the future".into(),
    ))
}

pub async fn upsert_goal<C>(
    db: &C,
    dog_id: Uuid,
    walk_amount: walk_amount::Model,
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

    let plan = plan_goal_upsert(current.as_ref(), walk_amount, today)?;
    match plan {
        GoalUpsertPlan::Noop => {}
        GoalUpsertPlan::Insert { walk_amount } => {
            insert_goal(db, dog_id, walk_amount, today).await?;
        }
        GoalUpsertPlan::UpdateCurrent { walk_amount } => {
            let Some(current) = current else {
                return Err(ServiceError::NotFound);
            };
            let mut active: dog_walk_goal::ActiveModel = current.into();
            active.walk_amount = Set(walk_amount);
            active.updated_at = Set(chrono::Utc::now().into());
            active.update(db).await?;
        }
        GoalUpsertPlan::ReplaceCurrent {
            close_existing_to,
            walk_amount,
        } => {
            let Some(current) = current else {
                return Err(ServiceError::NotFound);
            };
            let mut active: dog_walk_goal::ActiveModel = current.into();
            active.effective_to = Set(Some(close_existing_to));
            active.updated_at = Set(chrono::Utc::now().into());
            active.update(db).await?;
            insert_goal(db, dog_id, walk_amount, today).await?;
        }
    }

    Ok(())
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
    upsert_goal(
        db,
        dog_id,
        walk_amount::Model {
            minutes,
            cycle_days: DAILY_GOAL_CYCLE_DAYS,
        },
        today,
    )
    .await
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

async fn insert_goal<C>(
    db: &C,
    dog_id: Uuid,
    walk_amount: walk_amount::Model,
    effective_from: chrono::NaiveDate,
) -> ServiceResult<dog_walk_goal::Model>
where
    C: ConnectionTrait,
{
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
