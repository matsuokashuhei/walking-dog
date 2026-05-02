use sea_orm_migration::{prelude::*, schema::*};
use sea_orm_migration::sea_orm::sea_query::extension::postgres::Type;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_type(
                Type::create()
                    .as_enum(Alias::new("event_type"))
                    .values([
                        Alias::new("pee"),
                        Alias::new("poo"),
                        Alias::new("sniff"),
                        Alias::new("greet"),
                    ])
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("walk_events")
                    .if_not_exists()
                    .col(pk_uuid("id").extra("DEFAULT gen_random_uuid()"))
                    .col(uuid("walk_dog_id").not_null())
                    .col(
                        ColumnDef::new(Alias::new("event"))
                            .custom(Alias::new("event_type"))
                            .not_null(),
                    )
                    .col(timestamp("occurred_at").not_null())
                    .col(double("latitude").not_null())
                    .col(double("longitude").not_null())
                    .col(timestamp("created_at").not_null().extra("DEFAULT now()"))
                    .col(timestamp("updated_at").not_null().extra("DEFAULT now()"))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_walk_events_walk_dog_id")
                            .from(Alias::new("walk_events"), Alias::new("walk_dog_id"))
                            .to(Alias::new("walk_dogs"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_walk_events_walk_dog_id_occurred_at")
                    .table(Alias::new("walk_events"))
                    .col(Alias::new("walk_dog_id"))
                    .col(Alias::new("occurred_at"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table("walk_events").to_owned())
            .await?;

        manager
            .drop_type(Type::drop().name(Alias::new("event_type")).to_owned())
            .await
    }
}
