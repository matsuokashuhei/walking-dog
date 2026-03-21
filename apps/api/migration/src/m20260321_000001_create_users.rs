use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str { "m20260321_000001_create_users" }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create()
                .table(Users::Table)
                .if_not_exists()
                .col(ColumnDef::new(Users::Id).uuid().not_null().primary_key()
                    .extra("DEFAULT gen_random_uuid()"))
                .col(ColumnDef::new(Users::CognitoSub).string().not_null().unique_key())
                .col(ColumnDef::new(Users::DisplayName).string().null())
                .col(ColumnDef::new(Users::AvatarUrl).string().null())
                .col(ColumnDef::new(Users::CreatedAt).timestamp_with_time_zone().not_null()
                    .extra("DEFAULT now()"))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Users::Table).to_owned()).await
    }
}

#[derive(Iden)]
enum Users {
    Table, Id, CognitoSub, DisplayName, AvatarUrl, CreatedAt,
}
