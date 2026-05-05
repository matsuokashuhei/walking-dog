use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260412_000001_create_walk_events"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(WalkEvents::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WalkEvents::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(WalkEvents::WalkId).uuid().not_null())
                    .col(ColumnDef::new(WalkEvents::DogId).uuid())
                    .col(ColumnDef::new(WalkEvents::EventType).text().not_null())
                    .col(
                        ColumnDef::new(WalkEvents::OccurredAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(ColumnDef::new(WalkEvents::Lat).double())
                    .col(ColumnDef::new(WalkEvents::Lng).double())
                    .col(ColumnDef::new(WalkEvents::PhotoUrl).text())
                    .col(
                        ColumnDef::new(WalkEvents::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(WalkEvents::Table, WalkEvents::WalkId)
                            .to(Walks::Table, Walks::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(WalkEvents::Table, WalkEvents::DogId)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // CHECK constraints require raw SQL
        let db = manager.get_connection();
        db.execute_unprepared(
            "ALTER TABLE walk_events ADD CONSTRAINT chk_walk_events_event_type \
             CHECK (event_type IN ('pee', 'poo', 'photo'))",
        )
        .await?;
        db.execute_unprepared(
            "ALTER TABLE walk_events ADD CONSTRAINT chk_walk_events_photo_url \
             CHECK ((event_type = 'photo') = (photo_url IS NOT NULL))",
        )
        .await?;

        // Index for timeline queries: (walk_id, occurred_at)
        manager
            .create_index(
                Index::create()
                    .name("idx_walk_events_walk_id_occurred_at")
                    .table(WalkEvents::Table)
                    .col(WalkEvents::WalkId)
                    .col(WalkEvents::OccurredAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(WalkEvents::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum WalkEvents {
    Table,
    Id,
    WalkId,
    DogId,
    EventType,
    OccurredAt,
    Lat,
    Lng,
    PhotoUrl,
    CreatedAt,
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
