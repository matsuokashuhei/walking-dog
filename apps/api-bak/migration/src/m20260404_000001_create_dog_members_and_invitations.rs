use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260404_000001_create_dog_members_and_invitations"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Create dog_members table
        manager
            .create_table(
                Table::create()
                    .table(DogMembers::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DogMembers::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(DogMembers::DogId).uuid().not_null())
                    .col(ColumnDef::new(DogMembers::UserId).uuid().not_null())
                    .col(
                        ColumnDef::new(DogMembers::Role)
                            .string()
                            .not_null()
                            .extra("CHECK (role IN ('owner', 'member'))"),
                    )
                    .col(
                        ColumnDef::new(DogMembers::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(DogMembers::Table, DogMembers::DogId)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(DogMembers::Table, DogMembers::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // UNIQUE constraint on (dog_id, user_id)
        manager
            .create_index(
                Index::create()
                    .name("idx_dog_members_dog_user_unique")
                    .table(DogMembers::Table)
                    .col(DogMembers::DogId)
                    .col(DogMembers::UserId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Index on user_id
        manager
            .create_index(
                Index::create()
                    .name("idx_dog_members_user_id")
                    .table(DogMembers::Table)
                    .col(DogMembers::UserId)
                    .to_owned(),
            )
            .await?;

        // Index on dog_id
        manager
            .create_index(
                Index::create()
                    .name("idx_dog_members_dog_id")
                    .table(DogMembers::Table)
                    .col(DogMembers::DogId)
                    .to_owned(),
            )
            .await?;

        // 2. Create dog_invitations table
        manager
            .create_table(
                Table::create()
                    .table(DogInvitations::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DogInvitations::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(DogInvitations::DogId).uuid().not_null())
                    .col(
                        ColumnDef::new(DogInvitations::Token)
                            .string_len(64)
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(DogInvitations::InvitedBy).uuid().not_null())
                    .col(ColumnDef::new(DogInvitations::UsedBy).uuid().null())
                    .col(
                        ColumnDef::new(DogInvitations::ExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DogInvitations::UsedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(DogInvitations::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT now()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(DogInvitations::Table, DogInvitations::DogId)
                            .to(Dogs::Table, Dogs::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(DogInvitations::Table, DogInvitations::InvitedBy)
                            .to(Users::Table, Users::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(DogInvitations::Table, DogInvitations::UsedBy)
                            .to(Users::Table, Users::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Index on token
        manager
            .create_index(
                Index::create()
                    .name("idx_dog_invitations_token")
                    .table(DogInvitations::Table)
                    .col(DogInvitations::Token)
                    .to_owned(),
            )
            .await?;

        // 3. Data migration: copy dogs.user_id -> dog_members
        let db = manager.get_connection();
        db.execute_unprepared(
            "INSERT INTO dog_members (dog_id, user_id, role) SELECT id, user_id, 'owner' FROM dogs",
        )
        .await?;

        // 4. Drop user_id column from dogs
        manager
            .alter_table(
                Table::alter()
                    .table(Dogs::Table)
                    .drop_column(Dogs::UserId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Re-add user_id column to dogs
        manager
            .alter_table(
                Table::alter()
                    .table(Dogs::Table)
                    .add_column(ColumnDef::new(Dogs::UserId).uuid().null())
                    .to_owned(),
            )
            .await?;

        // 2. Restore user_id from dog_members (owner role)
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE dogs SET user_id = dm.user_id FROM dog_members dm WHERE dm.dog_id = dogs.id AND dm.role = 'owner'",
        )
        .await?;

        // 3. Make user_id NOT NULL and add FK
        manager
            .alter_table(
                Table::alter()
                    .table(Dogs::Table)
                    .modify_column(ColumnDef::new(Dogs::UserId).uuid().not_null())
                    .to_owned(),
            )
            .await?;

        // 4. Drop tables
        manager
            .drop_table(Table::drop().table(DogInvitations::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(DogMembers::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum DogMembers {
    Table,
    Id,
    DogId,
    UserId,
    Role,
    CreatedAt,
}

#[derive(Iden)]
enum DogInvitations {
    Table,
    Id,
    DogId,
    Token,
    InvitedBy,
    UsedBy,
    ExpiresAt,
    UsedAt,
    CreatedAt,
}

#[derive(Iden)]
enum Dogs {
    Table,
    Id,
    UserId,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
