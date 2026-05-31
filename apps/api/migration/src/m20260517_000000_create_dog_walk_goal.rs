//! Creates the `dog_walk_goal` table.
//!
//! `walk_amount` is a JSONB value-object shaped `{ minutes, cycle_days }`,
//! where `cycle_days` is the cycle length in days and `minutes` is the total
//! walk-time target across that cycle. Canonical examples:
//!
//!   * `{ "minutes": 30, "cycle_days": 1 }` — 30 minutes every day
//!   * `{ "minutes": 90, "cycle_days": 7 }` — 90 minutes per week
//!
//! Rows are append-only: a dog's goal history is the full set of rows ordered
//! by `effective_from`. `effective_to IS NULL` means "open-ended". Period
//! overlap prevention is enforced by the API mutation, not by a DB exclusion
//! constraint.

use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table("dog_walk_goal")
                    .if_not_exists()
                    .col(pk_uuid("id").extra("DEFAULT gen_random_uuid()"))
                    .col(uuid("dog_id").not_null())
                    .col(
                        ColumnDef::new(Alias::new("walk_amount"))
                            .json_binary()
                            .not_null(),
                    )
                    .col(date("effective_from").not_null())
                    .col(date("effective_to").null())
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
                    .check(
                        Expr::col(Alias::new("effective_to"))
                            .is_null()
                            .or(Expr::col(Alias::new("effective_to"))
                                .gte(Expr::col(Alias::new("effective_from")))),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_dog_walk_goal_dog_id")
                            .from(Alias::new("dog_walk_goal"), Alias::new("dog_id"))
                            .to(Alias::new("dog"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_dog_walk_goal_dog_effective_from")
                    .table(Alias::new("dog_walk_goal"))
                    .col(Alias::new("dog_id"))
                    .col((Alias::new("effective_from"), IndexOrder::Desc))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table("dog_walk_goal").to_owned())
            .await
    }
}
