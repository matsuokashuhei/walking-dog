use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260321_000002_create_dogs"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Dogs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Dogs::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Dogs::UserId).uuid().not_null())
                    .col(ColumnDef::new(Dogs::Name).string().not_null())
                    .col(ColumnDef::new(Dogs::Breed).string().null())
                    .col(ColumnDef::new(Dogs::Gender).string().null())
                    .col(ColumnDef::new(Dogs::BirthDate).json_binary().null())
                    .col(ColumnDef::new(Dogs::PhotoUrl).string().null())
                    .col(
                        ColumnDef::new(Dogs::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Dogs::Table, Dogs::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Dogs::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Dogs {
    Table,
    Id,
    UserId,
    Name,
    Breed,
    Gender,
    BirthDate,
    PhotoUrl,
    CreatedAt,
}
#[derive(Iden)]
enum Users {
    Table,
    Id,
}
