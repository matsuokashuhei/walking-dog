use anyhow::Result;
use async_graphql::{Context, InputObject, MaybeUndefined, Object, Upload};
use sea_orm::DatabaseConnection;
use tracing::error;
use uuid::Uuid;

use crate::graphql::{
    error::AppError,
    guard::AuthGuard,
    object::dog::{Dog, Gender},
};
use crate::{
    entity::{birthday::Model, sea_orm_active_enums::GenderType, user},
    service::dog::{self as dog_service, AddDogCommand, FieldUpdate, UpdateDogCommand},
    util::storage::{StorageError, upload_avatar},
};

#[derive(Default, Debug)]
pub struct DogMutation;

#[Object]
impl DogMutation {
    #[graphql(guard = "AuthGuard")]
    async fn add_dog(&self, ctx: &Context<'_>, input: AddDogInput) -> Result<Dog> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<DatabaseConnection>().unwrap();

        let AddDogInput {
            name,
            breed,
            gender,
            avatar,
            birthday,
        } = input;
        let avatar = match avatar {
            Some(file) => Some(upload_dog_avatar(ctx, file).await?),
            None => None,
        };
        let dog = dog_service::add_dog(
            db,
            user.id,
            AddDogCommand {
                name,
                breed,
                gender: gender_to_type(gender),
                avatar,
                birthday: birthday.map(Into::into),
            },
        )
        .await
        .map_err(AppError::from)?;
        Ok(Dog::from(dog))
    }

    #[graphql(guard = "AuthGuard")]
    async fn update_dog(&self, ctx: &Context<'_>, input: UpdateDogInput) -> Result<Dog> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();

        let UpdateDogInput {
            id,
            name,
            breed,
            gender,
            avatar,
            birthday,
            daily_goal_minutes,
        } = input;
        let avatar = match avatar {
            Some(file) => Some(upload_dog_avatar(ctx, file).await?),
            None => None,
        };
        let updated_dog = dog_service::update_dog(
            db,
            user.id,
            UpdateDogCommand {
                id,
                name,
                breed,
                gender: gender.map(gender_to_type),
                avatar,
                birthday: birthday_update(birthday),
                daily_goal_minutes: daily_goal_minutes_value(daily_goal_minutes)?,
            },
            chrono::Utc::now().date_naive(),
        )
        .await
        .map_err(AppError::from)?;
        Ok(Dog::from(updated_dog))
    }

    #[graphql(guard = "AuthGuard")]
    async fn remove_dog(&self, ctx: &Context<'_>, input: RemoveDogInput) -> Result<Dog> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let dog = dog_service::remove_dog(db, user.id, input.id)
            .await
            .map_err(AppError::from)?;
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

#[derive(Debug, Clone, InputObject)]
struct RemoveDogInput {
    id: Uuid,
}

fn gender_to_type(gender: Gender) -> GenderType {
    match gender {
        Gender::Male => GenderType::Male,
        Gender::Female => GenderType::Female,
        Gender::Other => GenderType::Other,
    }
}

fn birthday_update(birthday: MaybeUndefined<BirthdayInput>) -> FieldUpdate<Option<Model>> {
    match birthday {
        MaybeUndefined::Undefined => FieldUpdate::Unchanged,
        MaybeUndefined::Null => FieldUpdate::Set(None),
        MaybeUndefined::Value(birthday) => FieldUpdate::Set(Some(birthday.into())),
    }
}

fn daily_goal_minutes_value(daily_goal_minutes: MaybeUndefined<i32>) -> Result<Option<i32>> {
    match daily_goal_minutes {
        MaybeUndefined::Undefined => Ok(None),
        MaybeUndefined::Null => {
            Err(AppError::UnprocessableEntity("dailyGoalMinutes cannot be null".into()).into())
        }
        MaybeUndefined::Value(minutes) => Ok(Some(minutes)),
    }
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
