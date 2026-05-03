use std::{env, sync::LazyLock};

use crate::entities::*;
use async_graphql::dynamic::*;
use sea_orm::Database;
use seaography::{Builder, BuilderContext, async_graphql};

mod mutations;
mod queries;
mod types;

static CONTEXT: LazyLock<BuilderContext> = LazyLock::new(|| {
    let mut ctx = BuilderContext::default();
    ctx.types.timestamp_rfc3339 = true;
    ctx
});

pub async fn build_schema() -> Result<Schema, SchemaError> {
    let connection = Database::connect(env::var("DATABASE_URL").unwrap())
        .await
        .unwrap();
    let mut builder = Builder::new(&CONTEXT, connection.clone());
    builder = register_entity_modules(builder);
    builder = register_active_enums(builder);
    seaography::register_custom_inputs!(builder, [types::TrackPointCreateInput]);
    seaography::register_custom_outputs!(builder, [types::TrackPointBasic]);
    seaography::register_custom_queries!(builder, [queries::Operations]);
    seaography::register_custom_mutations!(builder, [mutations::Operations]);
    builder
        .schema_builder()
        .data(connection)
        .data(new_dynamodb_client().await)
        .finish()
}

async fn new_dynamodb_client() -> aws_sdk_dynamodb::Client {
    let config_loader = aws_config::from_env();
    let config = match env::var("DYNAMODB_ENDPOINT") {
        Ok(endpoint) => config_loader.endpoint_url(endpoint).load().await,
        Err(_) => config_loader.load().await,
    };
    aws_sdk_dynamodb::Client::new(&config)
}
