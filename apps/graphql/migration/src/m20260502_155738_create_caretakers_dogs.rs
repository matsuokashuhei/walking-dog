use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table("caretakers_dogs")
                    .if_not_exists()
                    .col(pk_uuid("id").extra("DEFAULT gen_random_uuid()"))
                    .col(uuid("caretaker_id").not_null())
                    .col(uuid("dog_id").not_null())
                    .col(
                        timestamp_with_time_zone("created_at")
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .col(
                        timestamp_with_time_zone("updated_at")
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_caretakers_dogs_caretaker_id")
                            .from(Alias::new("caretakers_dogs"), Alias::new("caretaker_id"))
                            .to(Alias::new("caretakers"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_caretakers_dogs_dog_id")
                            .from(Alias::new("caretakers_dogs"), Alias::new("dog_id"))
                            .to(Alias::new("dogs"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_caretakers_dogs_dog_id")
                    .table(Alias::new("caretakers_dogs"))
                    .col(Alias::new("dog_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table("caretakers_dogs").to_owned())
            .await
    }
}
