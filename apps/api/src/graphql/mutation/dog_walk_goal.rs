use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
    TransactionTrait,
};
use uuid::Uuid;

use crate::{
    entity::{dog, dog_walk_goal, user, user_dog, walk_amount},
    graphql::{error::AppError, guard::AuthGuard, object::dog_walk_goal::DogWalkGoal},
};

#[derive(Default, Debug)]
pub struct DogWalkGoalMutation;

#[Object]
impl DogWalkGoalMutation {
    #[graphql(guard = "AuthGuard")]
    async fn set_goal(&self, ctx: &Context<'_>, input: SetGoalInput) -> Result<DogWalkGoal> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let txn = db.begin().await?;

        let Ok(Some(_)) = dog::Entity::find_by_id(input.dog_id)
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .one(&txn)
            .await
        else {
            return Err(AppError::NotFound.into());
        };

        validate_walk_amount(&input.walk_amount)?;
        if input.effective_from > chrono::Utc::now().date_naive() {
            return Err(AppError::UnprocessableEntity(
                "effectiveFrom cannot be in the future".into(),
            )
            .into());
        }

        let previous = dog_walk_goal::Entity::find()
            .filter(dog_walk_goal::Column::DogId.eq(input.dog_id))
            .filter(dog_walk_goal::Column::EffectiveTo.is_null())
            .one(&txn)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        if let Some(prev) = previous {
            if input.effective_from <= prev.effective_from {
                return Err(AppError::UnprocessableEntity(
                    "effectiveFrom must be after the current goal's effective_from".into(),
                )
                .into());
            }
            let mut prev_active: dog_walk_goal::ActiveModel = prev.into();
            prev_active.effective_to =
                Set(Some(input.effective_from.pred_opt().ok_or_else(|| {
                    AppError::UnprocessableEntity("effectiveFrom cannot be the minimum date".into())
                })?));
            prev_active
                .update(&txn)
                .await
                .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        }

        let new_goal = dog_walk_goal::ActiveModel {
            dog_id: Set(input.dog_id),
            walk_amount: Set(input.walk_amount.into()),
            effective_from: Set(input.effective_from),
            effective_to: Set(None),
            ..Default::default()
        };
        let inserted = new_goal
            .insert(&txn)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;

        txn.commit()
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;

        Ok(DogWalkGoal::from(inserted))
    }

    #[graphql(guard = "AuthGuard")]
    async fn edit_goal(&self, ctx: &Context<'_>, input: EditGoalInput) -> Result<DogWalkGoal> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();

        let Ok(Some(_)) = dog::Entity::find_by_id(input.dog_id)
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .one(db)
            .await
        else {
            return Err(AppError::NotFound.into());
        };

        let goal = dog_walk_goal::Entity::find()
            .filter(dog_walk_goal::Column::DogId.eq(input.dog_id))
            .filter(dog_walk_goal::Column::EffectiveTo.is_null())
            .one(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?
            .ok_or(AppError::NotFound)?;

        validate_walk_amount(&input.walk_amount)?;

        let mut active: dog_walk_goal::ActiveModel = goal.into();
        active.walk_amount = Set(input.walk_amount.into());
        let updated = active
            .update(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;

        Ok(DogWalkGoal::from(updated))
    }
}

#[derive(Clone, Debug, InputObject)]
struct WalkAmountInput {
    minutes: i32,
    cycle_days: i32,
}

impl From<WalkAmountInput> for walk_amount::Model {
    fn from(input: WalkAmountInput) -> Self {
        Self {
            minutes: input.minutes,
            cycle_days: input.cycle_days,
        }
    }
}

#[derive(Clone, Debug, InputObject)]
struct SetGoalInput {
    dog_id: Uuid,
    walk_amount: WalkAmountInput,
    effective_from: chrono::NaiveDate,
}

#[derive(Clone, Debug, InputObject)]
struct EditGoalInput {
    dog_id: Uuid,
    walk_amount: WalkAmountInput,
}

fn validate_walk_amount(input: &WalkAmountInput) -> Result<()> {
    if input.minutes <= 0 {
        return Err(AppError::UnprocessableEntity("walkAmount.minutes must be > 0".into()).into());
    }
    if input.cycle_days < 1 {
        return Err(
            AppError::UnprocessableEntity("walkAmount.cycleDays must be >= 1".into()).into(),
        );
    }
    Ok(())
}
