use anyhow::Result;
use async_graphql::{Context, InputObject, MaybeUndefined, Object, Upload};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, Condition, DatabaseConnection, EntityTrait, ModelTrait, QueryFilter,
    TransactionTrait,
};
use tracing::error;
use uuid::Uuid;

use crate::graphql::{
    error::AppError,
    guard::AuthGuard,
    object::dog::{Dog, Gender},
};
use crate::{
    entity::{
        birthday::Model, dog, dog_walk_goal, sea_orm_active_enums::GenderType, user, user_dog,
        walk_amount,
    },
    util::storage::{StorageError, upload_avatar},
};

const MIN_DAILY_GOAL_MINUTES: i32 = 10;
const MAX_DAILY_GOAL_MINUTES: i32 = 120;
const DAILY_GOAL_CYCLE_DAYS: i32 = 1;

#[derive(Default, Debug)]
pub struct DogMutation;

#[Object]
impl DogMutation {
    #[graphql(guard = "AuthGuard")]
    async fn add_dog(&self, ctx: &Context<'_>, input: AddDogInput) -> Result<Dog> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let txn = db.begin().await?;
        let mut active_model = input.into_active_model();
        if let Some(file) = input.avatar {
            // if let Ok(file) = upload_avatar(ctx, file).await {
            //     active_model.avatar = Set(Some(file));
            // }
            let key = upload_avatar(ctx, file).await.map_err(|e| {
                if let Some(storage_error) = e.downcast_ref::<StorageError>() {
                    error!("Failed to upload avatar: {:?}", storage_error);
                    match storage_error {
                        StorageError::ContentTooLarge(_) => AppError::ContentTooLarge,
                        StorageError::InternalError(message) => AppError::InternalServerError(
                            format!("Failed to upload avatar: {}", message),
                        ),
                    }
                } else {
                    AppError::InternalServerError(format!("Failed to upload avatar: {}", e))
                }
            })?;
            active_model.avatar = Set(Some(key));
        }
        let dog = active_model.insert(db).await?;
        let active_model = user_dog::ActiveModel {
            user_id: Set(user.id),
            dog_id: Set(dog.id),
            ..Default::default()
        };
        active_model
            .insert(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        txn.commit()
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(Dog::from(dog))
    }

    #[graphql(guard = "AuthGuard")]
    async fn update_dog(&self, ctx: &Context<'_>, input: UpdateDogInput) -> Result<Dog> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let daily_goal_minutes = input.daily_goal_minutes()?;
        let txn = db.begin().await?;

        let Ok(Some(_)) = dog::Entity::find_by_id(input.id)
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .one(&txn)
            .await
        else {
            return Err(AppError::NotFound.into());
        };
        let mut active_model = input.into_active_model();
        if let Some(file) = input.avatar {
            active_model.avatar = Set(Some(upload_dog_avatar(ctx, file).await?));
        }

        let updated_dog = active_model
            .update(&txn)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;

        if let Some(minutes) = daily_goal_minutes {
            upsert_daily_goal(&txn, input.id, minutes, chrono::Utc::now().date_naive()).await?;
        }

        txn.commit()
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(Dog::from(updated_dog))
    }

    #[graphql(guard = "AuthGuard")]
    async fn remove_dog(&self, ctx: &Context<'_>, input: RemoveDogInput) -> Result<Dog> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let Ok(Some(dog)) = dog::Entity::find_by_id(input.id)
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .one(db)
            .await
        else {
            return Err(AppError::NotFound.into());
        };
        let Ok(Some(user_dog)) = user_dog::Entity::find()
            .filter(
                Condition::all()
                    .add(user_dog::Column::UserId.eq(user.id))
                    .add(user_dog::Column::DogId.eq(dog.id)),
            )
            .one(db)
            .await
        else {
            return Err(AppError::NotFound.into());
        };
        user_dog.delete(db).await?;
        Ok(Dog::from(dog))
    }
}

/// 飼い主が知っている範囲だけ送れる、ゆるい誕生日（年・月・日 すべて任意）。
#[derive(Clone, Debug, InputObject)]
struct BirthdayInput {
    year: Option<i32>,
    month: Option<i32>,
    day: Option<i32>,
}

impl From<BirthdayInput> for Model {
    fn from(input: BirthdayInput) -> Self {
        Model {
            year: input.year,
            month: input.month,
            day: input.day,
        }
    }
}

#[derive(Clone, Debug, InputObject)]
struct AddDogInput {
    name: String,
    breed: Option<String>,
    gender: Gender,
    avatar: Option<Upload>,
    birthday: Option<BirthdayInput>,
}

impl AddDogInput {
    #[allow(clippy::wrong_self_convention)]
    fn into_active_model(&self) -> dog::ActiveModel {
        dog::ActiveModel {
            name: Set(self.name.clone()),
            breed: Set(self.breed.clone()),
            gender: Set(match self.gender {
                Gender::Male => GenderType::Male,
                Gender::Female => GenderType::Female,
                Gender::Other => GenderType::Other,
            }),
            birthday: Set(self.birthday.clone().map(Into::into)),
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone, InputObject)]
struct UpdateDogInput {
    id: Uuid,
    name: Option<String>,
    breed: Option<String>,
    gender: Option<Gender>,
    avatar: Option<Upload>,
    // `MaybeUndefined` so we can tell "field omitted" (leave as-is) from
    // "field explicitly null" (clear the stored birthday) — `Option` can't.
    birthday: MaybeUndefined<BirthdayInput>,
    // Omitted leaves the current goal unchanged. Explicit null is rejected so
    // clients cannot accidentally erase an edit-screen goal.
    daily_goal_minutes: MaybeUndefined<i32>,
}

impl UpdateDogInput {
    fn daily_goal_minutes(&self) -> Result<Option<i32>> {
        match &self.daily_goal_minutes {
            MaybeUndefined::Undefined => Ok(None),
            MaybeUndefined::Null => {
                Err(AppError::UnprocessableEntity("dailyGoalMinutes cannot be null".into()).into())
            }
            MaybeUndefined::Value(minutes) => validate_daily_goal_minutes(*minutes).map(Some),
        }
    }

    #[allow(clippy::wrong_self_convention)]
    fn into_active_model(&self) -> dog::ActiveModel {
        dog::ActiveModel {
            id: Set(self.id),
            name: self.name.clone().map_or(NotSet, Set),
            breed: self.breed.clone().map_or(NotSet, |breed| Set(breed.into())),
            gender: self.gender.map_or(NotSet, |gender| {
                Set(match gender {
                    Gender::Male => GenderType::Male,
                    Gender::Female => GenderType::Female,
                    Gender::Other => GenderType::Other,
                })
            }),
            birthday: match &self.birthday {
                MaybeUndefined::Undefined => NotSet,
                MaybeUndefined::Null => Set(None),
                MaybeUndefined::Value(birthday) => Set(Some(birthday.clone().into())),
            },
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone, InputObject)]
struct RemoveDogInput {
    id: Uuid,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum DailyGoalUpsertPlan {
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

async fn upload_dog_avatar(ctx: &Context<'_>, file: Upload) -> Result<String> {
    upload_avatar(ctx, file).await.map_err(|e| {
        if let Some(storage_error) = e.downcast_ref::<StorageError>() {
            error!("Failed to upload avatar: {:?}", storage_error);
            match storage_error {
                StorageError::ContentTooLarge(_) => AppError::ContentTooLarge.into(),
                StorageError::InternalError(message) => {
                    AppError::InternalServerError(format!("Failed to upload avatar: {}", message))
                        .into()
                }
            }
        } else {
            AppError::InternalServerError(format!("Failed to upload avatar: {}", e)).into()
        }
    })
}

fn validate_daily_goal_minutes(minutes: i32) -> Result<i32> {
    if !(MIN_DAILY_GOAL_MINUTES..=MAX_DAILY_GOAL_MINUTES).contains(&minutes) {
        return Err(AppError::UnprocessableEntity(
            "dailyGoalMinutes must be between 10 and 120".into(),
        )
        .into());
    }
    Ok(minutes)
}

fn plan_daily_goal_upsert(
    current: Option<&dog_walk_goal::Model>,
    minutes: i32,
    today: chrono::NaiveDate,
) -> Result<DailyGoalUpsertPlan> {
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
                AppError::UnprocessableEntity("today cannot be the minimum date".into())
            })?,
            minutes,
        });
    }

    Err(
        AppError::UnprocessableEntity("current daily goal cannot start in the future".into())
            .into(),
    )
}

async fn upsert_daily_goal(
    txn: &sea_orm::DatabaseTransaction,
    dog_id: Uuid,
    minutes: i32,
    today: chrono::NaiveDate,
) -> Result<()> {
    let current = dog_walk_goal::Entity::find()
        .filter(dog_walk_goal::Column::DogId.eq(dog_id))
        .filter(dog_walk_goal::Column::EffectiveTo.is_null())
        .one(txn)
        .await
        .map_err(|e| AppError::InternalServerError(e.to_string()))?;

    let plan = plan_daily_goal_upsert(current.as_ref(), minutes, today)?;
    match plan {
        DailyGoalUpsertPlan::Noop => {}
        DailyGoalUpsertPlan::Insert { minutes } => {
            insert_daily_goal(txn, dog_id, minutes, today).await?;
        }
        DailyGoalUpsertPlan::UpdateCurrent { minutes } => {
            let Some(current) = current else {
                return Err(AppError::NotFound.into());
            };
            let mut active: dog_walk_goal::ActiveModel = current.into();
            active.walk_amount = Set(walk_amount::Model {
                minutes,
                cycle_days: DAILY_GOAL_CYCLE_DAYS,
            });
            active.updated_at = Set(chrono::Utc::now().into());
            active
                .update(txn)
                .await
                .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        }
        DailyGoalUpsertPlan::ReplaceCurrent {
            close_existing_to,
            minutes,
        } => {
            let Some(current) = current else {
                return Err(AppError::NotFound.into());
            };
            let mut active: dog_walk_goal::ActiveModel = current.into();
            active.effective_to = Set(Some(close_existing_to));
            active.updated_at = Set(chrono::Utc::now().into());
            active
                .update(txn)
                .await
                .map_err(|e| AppError::InternalServerError(e.to_string()))?;
            insert_daily_goal(txn, dog_id, minutes, today).await?;
        }
    }

    Ok(())
}

async fn insert_daily_goal(
    txn: &sea_orm::DatabaseTransaction,
    dog_id: Uuid,
    minutes: i32,
    effective_from: chrono::NaiveDate,
) -> Result<dog_walk_goal::Model> {
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
    .insert(txn)
    .await
    .map_err(|e| AppError::InternalServerError(e.to_string()).into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::walk_amount;

    fn current_goal(
        effective_from: chrono::NaiveDate,
        minutes: i32,
        cycle_days: i32,
    ) -> dog_walk_goal::Model {
        let now = chrono::DateTime::from_timestamp(1_800_000_000, 0).unwrap();
        dog_walk_goal::Model {
            id: Uuid::now_v7(),
            dog_id: Uuid::now_v7(),
            walk_amount: walk_amount::Model {
                minutes,
                cycle_days,
            },
            effective_from,
            effective_to: None,
            created_at: now.into(),
            updated_at: now.into(),
        }
    }

    #[test]
    fn daily_goal_plan_updates_goal_that_started_today() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
        let goal = current_goal(today, 30, 1);

        let plan = plan_daily_goal_upsert(Some(&goal), 45, today).unwrap();

        assert_eq!(plan, DailyGoalUpsertPlan::UpdateCurrent { minutes: 45 });
    }

    #[test]
    fn daily_goal_plan_replaces_prior_open_goal_from_today_onward() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
        let previous_day = chrono::NaiveDate::from_ymd_opt(2026, 5, 29).unwrap();
        let goal = current_goal(previous_day, 30, 1);

        let plan = plan_daily_goal_upsert(Some(&goal), 45, today).unwrap();

        assert_eq!(
            plan,
            DailyGoalUpsertPlan::ReplaceCurrent {
                close_existing_to: previous_day,
                minutes: 45,
            }
        );
    }

    #[test]
    fn daily_goal_plan_skips_same_daily_goal() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
        let goal = current_goal(today, 30, 1);

        let plan = plan_daily_goal_upsert(Some(&goal), 30, today).unwrap();

        assert_eq!(plan, DailyGoalUpsertPlan::Noop);
    }

    #[test]
    fn validate_daily_goal_minutes_rejects_out_of_range_values() {
        assert!(validate_daily_goal_minutes(9).is_err());
        assert!(validate_daily_goal_minutes(121).is_err());
        assert_eq!(validate_daily_goal_minutes(30).unwrap(), 30);
    }
}
