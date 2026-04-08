use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260407_000001_create_encounters_and_friendships"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add encounter_detection_enabled to users
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .add_column(
                        ColumnDef::new(Users::EncounterDetectionEnabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .to_owned(),
            )
            .await?;

        // 2. Create encounters table
        manager
            .create_table(
                Table::create()
                    .table(Encounters::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Encounters::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Encounters::WalkId).uuid().not_null())
                    .col(ColumnDef::new(Encounters::DogId1).uuid().not_null())
                    .col(ColumnDef::new(Encounters::DogId2).uuid().not_null())
                    .col(
                        ColumnDef::new(Encounters::DurationSec)
                            .integer()
                            .not_null()
                            .default(30),
                    )
                    .col(
                        ColumnDef::new(Encounters::MetAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .col(
                        ColumnDef::new(Encounters::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Encounters::Table, Encounters::WalkId)
                            .to(Walks::Table, Walks::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Encounters::Table, Encounters::DogId1)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Encounters::Table, Encounters::DogId2)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // CHECK constraints (cross-column, requires raw SQL)
        let db = manager.get_connection();
        db.execute_unprepared(
            "ALTER TABLE encounters ADD CONSTRAINT chk_encounters_dog_order CHECK (dog_id_1 < dog_id_2)",
        )
        .await?;
        db.execute_unprepared(
            "ALTER TABLE encounters ADD CONSTRAINT chk_encounters_different_dogs CHECK (dog_id_1 != dog_id_2)",
        )
        .await?;

        // UNIQUE constraint on (walk_id, dog_id_1, dog_id_2)
        manager
            .create_index(
                Index::create()
                    .name("idx_encounters_walk_dog_pair_unique")
                    .table(Encounters::Table)
                    .col(Encounters::WalkId)
                    .col(Encounters::DogId1)
                    .col(Encounters::DogId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Indexes for query patterns
        manager
            .create_index(
                Index::create()
                    .name("idx_encounters_dog_id_1")
                    .table(Encounters::Table)
                    .col(Encounters::DogId1)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_encounters_dog_id_2")
                    .table(Encounters::Table)
                    .col(Encounters::DogId2)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_encounters_walk_id")
                    .table(Encounters::Table)
                    .col(Encounters::WalkId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_encounters_met_at")
                    .table(Encounters::Table)
                    .col(Encounters::MetAt)
                    .to_owned(),
            )
            .await?;

        // 3. Create friendships table
        manager
            .create_table(
                Table::create()
                    .table(Friendships::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Friendships::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Friendships::DogId1).uuid().not_null())
                    .col(ColumnDef::new(Friendships::DogId2).uuid().not_null())
                    .col(
                        ColumnDef::new(Friendships::EncounterCount)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(
                        ColumnDef::new(Friendships::TotalInteractionSec)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Friendships::FirstMetAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Friendships::LastMetAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Friendships::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Friendships::Table, Friendships::DogId1)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Friendships::Table, Friendships::DogId2)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // CHECK constraints for friendships
        db.execute_unprepared(
            "ALTER TABLE friendships ADD CONSTRAINT chk_friendships_dog_order CHECK (dog_id_1 < dog_id_2)",
        )
        .await?;
        db.execute_unprepared(
            "ALTER TABLE friendships ADD CONSTRAINT chk_friendships_different_dogs CHECK (dog_id_1 != dog_id_2)",
        )
        .await?;

        // UNIQUE on (dog_id_1, dog_id_2)
        manager
            .create_index(
                Index::create()
                    .name("idx_friendships_dog_pair_unique")
                    .table(Friendships::Table)
                    .col(Friendships::DogId1)
                    .col(Friendships::DogId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_friendships_dog_id_1")
                    .table(Friendships::Table)
                    .col(Friendships::DogId1)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_friendships_dog_id_2")
                    .table(Friendships::Table)
                    .col(Friendships::DogId2)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_friendships_last_met_at")
                    .table(Friendships::Table)
                    .col(Friendships::LastMetAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Friendships::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Encounters::Table).to_owned())
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .drop_column(Users::EncounterDetectionEnabled)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Users {
    Table,
    EncounterDetectionEnabled,
}

#[derive(Iden)]
enum Dogs {
    Table,
    Id,
}

#[derive(Iden)]
enum Walks {
    Table,
    Id,
}

#[derive(Iden)]
enum Encounters {
    Table,
    Id,
    WalkId,
    #[iden = "dog_id_1"]
    DogId1,
    #[iden = "dog_id_2"]
    DogId2,
    DurationSec,
    MetAt,
    CreatedAt,
}

#[derive(Iden)]
enum Friendships {
    Table,
    Id,
    #[iden = "dog_id_1"]
    DogId1,
    #[iden = "dog_id_2"]
    DogId2,
    EncounterCount,
    TotalInteractionSec,
    FirstMetAt,
    LastMetAt,
    CreatedAt,
}
