use std::{env, sync::LazyLock};

use crate::entities::*;
use async_graphql::dynamic::*;
use sea_orm::Database;
use seaography::{Builder, BuilderContext, async_graphql};

static CONTEXT: LazyLock<BuilderContext> = LazyLock::new(BuilderContext::default);

pub async fn build_schema() -> Result<Schema, SchemaError> {
    let connection = Database::connect(env::var("DATABASE_URL").unwrap())
        .await
        .unwrap();
    let mut builder = Builder::new(&CONTEXT, connection.clone());
    builder = register_entity_modules(builder);
    builder = register_active_enums(builder);
    builder
        // .set_depth_limit(depth)
        // .set_complexity_limit(complexity)
        .schema_builder()
        .data(connection)
        .data(new_dynamodb_client().await)
        .finish()
}

async fn new_dynamodb_client() -> aws_sdk_dynamodb::Client {
    let config = aws_config::from_env()
        .endpoint_url("dynamodb://dynamodb:8000")
        .load()
        .await;
    aws_sdk_dynamodb::Client::new(&config)
}
