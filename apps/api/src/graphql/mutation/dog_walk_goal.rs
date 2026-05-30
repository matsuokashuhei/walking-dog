use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

use crate::{
    entity::{user, walk_amount},
    graphql::{error::AppError, guard::AuthGuard, object::dog_walk_goal::DogWalkGoal},
    service::dog_walk_goal as dog_walk_goal_service,
};

#[derive(Default, Debug)]
pub struct DogWalkGoalMutation;

#[Object]
impl DogWalkGoalMutation {
    #[graphql(guard = "AuthGuard")]
    async fn set_goal(&self, ctx: &Context<'_>, input: SetGoalInput) -> Result<DogWalkGoal> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();

        let inserted = dog_walk_goal_service::set_goal_for_user(
            db,
            user.id,
            input.dog_id,
            input.walk_amount.into(),
            input.effective_from,
            chrono::Utc::now().date_naive(),
        )
        .await
        .map_err(AppError::from)?;
        Ok(DogWalkGoal::from(inserted))
    }

    #[graphql(guard = "AuthGuard")]
    async fn edit_goal(&self, ctx: &Context<'_>, input: EditGoalInput) -> Result<DogWalkGoal> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();

        let updated = dog_walk_goal_service::edit_current_goal_for_user(
            db,
            user.id,
            input.dog_id,
            input.walk_amount.into(),
        )
        .await
        .map_err(AppError::from)?;
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
