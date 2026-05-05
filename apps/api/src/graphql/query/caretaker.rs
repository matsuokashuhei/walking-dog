use crate::{entity::caretakers, graphql::object::caretaker::Caretaker};
use anyhow::{Result, anyhow};
use async_graphql::{Context, Object};
use sea_orm::EntityTrait;

#[derive(Default, Debug)]
pub struct CaretakerQuery;

#[Object]
impl CaretakerQuery {
    async fn caretakers(&self, ctx: &Context<'_>) -> Result<Vec<Caretaker>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let caretakers = caretakers::Entity::find()
            .all(db)
            .await
            .map_err(|e| anyhow!(e))?
            .into_iter()
            .map(|caretaker| Caretaker::from(caretaker))
            .collect::<Vec<Caretaker>>();
        Ok(caretakers)
    }
}
