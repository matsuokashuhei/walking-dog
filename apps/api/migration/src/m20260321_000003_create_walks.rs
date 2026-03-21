use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str { "m20260321_000003_create_walks" }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create()
                .table(Walks::Table)
                .if_not_exists()
                .col(ColumnDef::new(Walks::Id).uuid().not_null().primary_key()
                    .extra("DEFAULT gen_random_uuid()"))
                .col(ColumnDef::new(Walks::UserId).uuid().not_null())
                .col(ColumnDef::new(Walks::Status).string().not_null()
                    .extra("DEFAULT 'active'"))
                .col(ColumnDef::new(Walks::DistanceM).integer().null())
                .col(ColumnDef::new(Walks::DurationSec).integer().null())
                .col(ColumnDef::new(Walks::StartedAt).timestamp_with_time_zone().not_null())
                .col(ColumnDef::new(Walks::EndedAt).timestamp_with_time_zone().null())
                .foreign_key(
                    ForeignKey::create()
                        .from(Walks::Table, Walks::UserId)
                        .to(Users::Table, Users::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Walks::Table).to_owned()).await
    }
}

#[derive(Iden)]
enum Walks { Table, Id, UserId, Status, DistanceM, DurationSec, StartedAt, EndedAt }
#[derive(Iden)]
enum Users { Table, Id }
