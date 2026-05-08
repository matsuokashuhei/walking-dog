use sea_orm_migration::sea_orm::sea_query::extension::postgres::Type;
use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_type(
                Type::create()
                    .as_enum(Alias::new("gender_type"))
                    .values([
                        Alias::new("female"),
                        Alias::new("male"),
                        Alias::new("other"),
                    ])
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("dog")
                    .if_not_exists()
                    .col(pk_uuid("id").extra("DEFAULT gen_random_uuid()"))
                    .col(string("name"))
                    .col(string("breed").null())
                    .col(
                        ColumnDef::new(Alias::new("gender"))
                            .custom(Alias::new("gender_type"))
                            .not_null()
                            .default("other"),
                    )
                    .col(string("avatar").null())
                    .col(
                        timestamp_with_time_zone("created_at")
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .col(
                        timestamp_with_time_zone("updated_at")
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table("dog").to_owned())
            .await?;

        manager
            .drop_type(Type::drop().name(Alias::new("gender_type")).to_owned())
            .await
    }
}
