use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table("walk_photos")
                    .if_not_exists()
                    .col(pk_uuid("id").extra("DEFAULT gen_random_uuid()"))
                    .col(uuid("walk_id").not_null())
                    .col(timestamp("occurred_at").not_null())
                    .col(string("file").not_null())
                    .col(double("latitude").not_null())
                    .col(double("longitude").not_null())
                    .col(timestamp("created_at").not_null().extra("DEFAULT now()"))
                    .col(timestamp("updated_at").not_null().extra("DEFAULT now()"))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_walk_photos_walk_id")
                            .from(Alias::new("walk_photos"), Alias::new("walk_id"))
                            .to(Alias::new("walks"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_walk_photos_walk_id")
                    .table(Alias::new("walk_photos"))
                    .col(Alias::new("walk_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table("walk_photos").to_owned())
            .await
    }
}
