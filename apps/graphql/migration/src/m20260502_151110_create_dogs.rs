use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table("dogs")
                    .if_not_exists()
                    .col(pk_uuid("id").extra("DEFAULT gen_random_uuid()"))
                    .col(string("name").not_null())
                    .col(string("breed"))
                    .col(string("gender"))
                    .col(timestamp("created_at").not_null().extra("DEFAULT CURRENT_TIMESTAMP"))
                    .col(timestamp("updated_at").not_null().extra("DEFAULT CURRENT_TIMESTAMP"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table("dogs").to_owned())
            .await
    }
}
