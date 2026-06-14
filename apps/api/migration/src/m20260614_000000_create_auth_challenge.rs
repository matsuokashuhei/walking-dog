use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AuthChallenge::Table)
                    .if_not_exists()
                    .col(pk_uuid(AuthChallenge::Id).extra("DEFAULT gen_random_uuid()"))
                    .col(string(AuthChallenge::Email).not_null())
                    .col(string(AuthChallenge::ProviderFlow).not_null())
                    .col(string(AuthChallenge::ProviderSession).not_null())
                    .col(timestamp_with_time_zone(AuthChallenge::ExpiresAt).not_null())
                    .col(timestamp_with_time_zone(AuthChallenge::ConsumedAt).null())
                    .col(
                        timestamp_with_time_zone(AuthChallenge::CreatedAt)
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .col(
                        timestamp_with_time_zone(AuthChallenge::UpdatedAt)
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_auth_challenge_email")
                    .table(AuthChallenge::Table)
                    .col(AuthChallenge::Email)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AuthChallenge::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum AuthChallenge {
    Table,
    Id,
    Email,
    ProviderFlow,
    ProviderSession,
    ExpiresAt,
    ConsumedAt,
    CreatedAt,
    UpdatedAt,
}
