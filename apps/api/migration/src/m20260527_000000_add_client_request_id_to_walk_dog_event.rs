use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("walk_dog_event"))
                    .add_column(
                        ColumnDef::new(Alias::new("client_request_id"))
                            .uuid()
                            .to_owned(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_walk_dog_event_client_request_id")
                    .table(Alias::new("walk_dog_event"))
                    .col(Alias::new("client_request_id"))
                    .unique()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_walk_dog_event_client_request_id")
                    .table(Alias::new("walk_dog_event"))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("walk_dog_event"))
                    .drop_column(Alias::new("client_request_id"))
                    .to_owned(),
            )
            .await
    }
}
