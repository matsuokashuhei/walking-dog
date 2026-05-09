use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, _: &SchemaManager) -> Result<(), DbErr> {
        if std::env::var("AWS_DYNAMODB_ENDPOINT").is_err() {
            return Ok(()); // Skip migration if no DynamoDB endpoint is configured
        }

        let config = aws_config::from_env()
            .endpoint_url(std::env::var("AWS_DYNAMODB_ENDPOINT").unwrap())
            .load()
            .await;
        let client = aws_sdk_dynamodb::Client::new(&config);
        client
            .create_table()
            .table_name("track_point")
            .billing_mode(aws_sdk_dynamodb::types::BillingMode::PayPerRequest)
            .attribute_definitions(
                aws_sdk_dynamodb::types::AttributeDefinition::builder()
                    .attribute_name("walk_id")
                    .attribute_type(aws_sdk_dynamodb::types::ScalarAttributeType::S)
                    .build()
                    .unwrap(),
            )
            .attribute_definitions(
                aws_sdk_dynamodb::types::AttributeDefinition::builder()
                    .attribute_name("tracked_at")
                    .attribute_type(aws_sdk_dynamodb::types::ScalarAttributeType::N)
                    .build()
                    .unwrap(),
            )
            .key_schema(
                aws_sdk_dynamodb::types::KeySchemaElement::builder()
                    .attribute_name("walk_id")
                    .key_type(aws_sdk_dynamodb::types::KeyType::Hash)
                    .build()
                    .unwrap(),
            )
            .key_schema(
                aws_sdk_dynamodb::types::KeySchemaElement::builder()
                    .attribute_name("tracked_at")
                    .key_type(aws_sdk_dynamodb::types::KeyType::Range)
                    .build()
                    .unwrap(),
            )
            .send()
            .await
            .map_err(|e| DbErr::Migration(format!("Failed to create DynamoDB table: {}", e)))?;
        Ok(())
    }

    async fn down(&self, _: &SchemaManager) -> Result<(), DbErr> {
        if std::env::var("AWS_DYNAMODB_ENDPOINT").is_err() {
            return Ok(()); // Skip migration if no DynamoDB endpoint is configured
        }

        let config = aws_config::from_env()
            .endpoint_url(std::env::var("AWS_DYNAMODB_ENDPOINT").unwrap())
            .load()
            .await;
        let client = aws_sdk_dynamodb::Client::new(&config);
        client
            .delete_table()
            .table_name("track_point")
            .send()
            .await
            .map_err(|e| DbErr::Migration(format!("Failed to delete DynamoDB table: {}", e)))?;
        Ok(())
    }
}
