use anyhow::Result;
use async_graphql::{Context, InputObject, Object};
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, TransactionTrait};

use crate::entity::dog;
use crate::entity::sea_orm_active_enums::GenderType;
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
