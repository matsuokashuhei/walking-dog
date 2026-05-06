use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table("walk")
                    .if_not_exists()
                    .col(pk_uuid("id").extra("DEFAULT gen_random_uuid()"))
                    .col(uuid("user_id").not_null())
                    .col(timestamp_with_time_zone("started_at").not_null())
                    .col(timestamp_with_time_zone_null("ended_at"))
                    .col(integer_null("distance"))
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
                            .name("fk_walk_user_id")
                            .from(Alias::new("walk"), Alias::new("user_id"))
                            .to(Alias::new("user"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_walk_user_id")
                    .table(Alias::new("walk"))
                    .col(Alias::new("user_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table("walk").to_owned())
            .await
    }
}
