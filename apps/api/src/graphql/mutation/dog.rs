use async_graphql::{Context, InputObject, Object, Result, ID};
use std::sync::Arc;
use crate::AppState;
use crate::graphql::types::dog::{BirthDateInput, Dog};
use crate::services::{dog_service, user_service};

#[derive(InputObject)]
pub struct CreateDogInput {
    pub name: String,
    pub breed: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<BirthDateInput>,
}

#[derive(InputObject)]
pub struct UpdateDogInput {
    pub name: Option<String>,
    pub breed: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<BirthDateInput>,
}

#[derive(Default)]
pub struct DogMutation;

#[Object]
impl DogMutation {
    async fn create_dog(&self, ctx: &Context<'_>, input: CreateDogInput) -> Result<Dog> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        let user = user_service::get_or_create_user(&state.db, cognito_sub).await?;
        let birth_date = input.birth_date.as_ref().map(|bd| bd.to_json());
        Ok(dog_service::create_dog(
            &state.db,
            user.id,
            input.name,
            input.breed,
            input.gender,
            birth_date,
        )
        .await?)
    }

    async fn update_dog(
        &self,
        ctx: &Context<'_>,
        id: ID,
        input: UpdateDogInput,
    ) -> Result<Dog> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        let user = user_service::get_or_create_user(&state.db, cognito_sub).await?;
        let dog_id = uuid::Uuid::parse_str(&id)
            .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
        let birth_date = input.birth_date.as_ref().map(|bd| bd.to_json());
        Ok(dog_service::update_dog(
            &state.db,
            dog_id,
            user.id,
            input.name,
            input.breed,
            input.gender,
            birth_date,
        )
        .await?)
    }

    async fn delete_dog(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let state = ctx.data::<Arc<AppState>>()?;
        let cognito_sub = ctx.data::<String>()?;
        let user = user_service::get_or_create_user(&state.db, cognito_sub).await?;
        let dog_id = uuid::Uuid::parse_str(&id)
            .map_err(|_| async_graphql::Error::new("Invalid dog ID"))?;
        Ok(dog_service::delete_dog(&state.db, dog_id, user.id).await?)
    }

    async fn generate_dog_photo_upload_url(
        &self,
        _ctx: &Context<'_>,
        _dog_id: ID,
    ) -> Result<String> {
        Err(async_graphql::Error::new("Not implemented"))
    }
}
