use async_graphql::{Context, InputObject, Object, Result, ID};
use crate::graphql::types::dog::{BirthDateInput, Dog};

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
    async fn create_dog(&self, _ctx: &Context<'_>, _input: CreateDogInput) -> Result<Dog> {
        Err(async_graphql::Error::new("Not implemented"))
    }

    async fn update_dog(
        &self,
        _ctx: &Context<'_>,
        _id: ID,
        _input: UpdateDogInput,
    ) -> Result<Dog> {
        Err(async_graphql::Error::new("Not implemented"))
    }

    async fn delete_dog(&self, _ctx: &Context<'_>, _id: ID) -> Result<bool> {
        Err(async_graphql::Error::new("Not implemented"))
    }

    async fn generate_dog_photo_upload_url(
        &self,
        _ctx: &Context<'_>,
        _dog_id: ID,
    ) -> Result<String> {
        Err(async_graphql::Error::new("Not implemented"))
    }
}
