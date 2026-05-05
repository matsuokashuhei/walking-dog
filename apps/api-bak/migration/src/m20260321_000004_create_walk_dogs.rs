use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260321_000004_create_walk_dogs"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(WalkDogs::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(WalkDogs::WalkId).uuid().not_null())
                    .col(ColumnDef::new(WalkDogs::DogId).uuid().not_null())
                    .primary_key(Index::create().col(WalkDogs::WalkId).col(WalkDogs::DogId))
                    .foreign_key(
                        ForeignKey::create()
                            .from(WalkDogs::Table, WalkDogs::WalkId)
                            .to(Walks::Table, Walks::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(WalkDogs::Table, WalkDogs::DogId)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(WalkDogs::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum WalkDogs {
    Table,
    WalkId,
    DogId,
}
#[derive(Iden)]
enum Walks {
    Table,
    Id,
}
#[derive(Iden)]
enum Dogs {
    Table,
    Id,
}
