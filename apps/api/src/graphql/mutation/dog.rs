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
    entity::{birthday::Model, dog, sea_orm_active_enums::GenderType, user, user_dog},
    storage::{StorageError, upload_avatar},
};

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
                if let Some(storage_error) = e.downcast_ref::<crate::storage::StorageError>() {
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
        let Ok(Some(_)) = dog::Entity::find_by_id(input.id)
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .one(db)
            .await
        else {
            return Err(AppError::NotFound.into());
        };
        let mut active_model = input.into_active_model();
        if let Some(file) = input.avatar
            && let Ok(file) = upload_avatar(ctx, file).await
        {
            active_model.avatar = Set(Some(file));
        }
        let updated_dog = active_model.update(db).await?;
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
}

impl UpdateDogInput {
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
