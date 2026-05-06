use anyhow::Result;
use anyhow::anyhow;
use async_graphql::{Context, InputObject, Object};
use sea_orm::ActiveValue;
use sea_orm::ActiveValue::Set;
use sea_orm::Condition;
use sea_orm::ModelTrait;
use sea_orm::QueryFilter;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, TransactionTrait};
use uuid::Uuid;

use crate::entity::sea_orm_active_enums::GenderType;
use crate::entity::{dog, user_dog};
use crate::graphql::object::dog::{Dog, Gender};
use crate::{entity::user, graphql::guard::AuthGuard};

#[derive(Default, Debug)]
pub struct DogMutation;

#[Object]
impl DogMutation {
    #[graphql(guard = "AuthGuard")]
    async fn create_dog(&self, ctx: &Context<'_>, input: CreateDogInput) -> Result<Dog> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let txn = db.begin().await?;
        let user = ctx.data::<user::Model>().unwrap();
        let active_model = input.into_active_model();
        let dog = active_model.insert(db).await?;
        let active_moodel = crate::entity::user_dog::ActiveModel {
            user_id: Set(user.id),
            dog_id: Set(dog.id),
            ..Default::default()
        };
        active_moodel.insert(db).await?;
        txn.commit().await?;
        Ok(Dog::from(dog))
    }

    #[graphql(guard = "AuthGuard")]
    async fn update_dog(&self, ctx: &Context<'_>, input: UpdateDogInput) -> Result<Dog> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let Ok(Some(dog)) = dog::Entity::find_by_id(input.id)
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .one(db)
            .await
        else {
            return Err(anyhow!("Dog not found or not owned by user"));
        };
        let active_model = input.into_active_model();
        let updated_dog = active_model.update(db).await?;
        Ok(Dog::from(updated_dog))
    }

    #[graphql(guard = "AuthGuard")]
    async fn delete_dog(&self, ctx: &Context<'_>, id: Uuid) -> Result<Dog> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        let Ok(Some(dog)) = dog::Entity::find_by_id(id)
            .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
            .one(db)
            .await
        else {
            return Err(anyhow!("Dog not found or not owned by user"));
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
            return Err(anyhow!("Dog not found or not owned by user"));
        };
        user_dog.delete(db).await?;
        Ok(Dog::from(dog))
    }
}

#[derive(Debug, InputObject)]
struct CreateDogInput {
    name: String,
    breed: Option<String>,
    gender: Gender,
    avatar: Option<String>,
}

impl CreateDogInput {
    fn into_active_model(&self) -> dog::ActiveModel {
        dog::ActiveModel {
            name: Set(self.name.clone()),
            breed: Set(self.breed.clone()),
            gender: Set(match self.gender {
                Gender::Male => GenderType::Male,
                Gender::Female => GenderType::Female,
                Gender::Other => GenderType::Other,
            }),
            avatar: Set(self.avatar.clone()),
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone, InputObject)]
struct UpdateDogInput {
    id: uuid::Uuid,
    name: Option<String>,
    breed: Option<String>,
    gender: Option<Gender>,
    avatar: Option<String>,
}

impl UpdateDogInput {
    fn into_active_model(&self) -> dog::ActiveModel {
        dog::ActiveModel {
            id: Set(self.id),
            name: self.name.clone().map_or(ActiveValue::NotSet, Set),
            breed: self
                .breed
                .clone()
                .map_or(ActiveValue::NotSet, |breed| Set(breed.into())),
            gender: self.gender.map_or(ActiveValue::NotSet, |gender| {
                Set(match gender {
                    Gender::Male => GenderType::Male,
                    Gender::Female => GenderType::Female,
                    Gender::Other => GenderType::Other,
                })
            }),
            avatar: self
                .avatar
                .clone()
                .map_or(ActiveValue::NotSet, |avatar| Set(avatar.into())),
            ..Default::default()
        }
    }
}
