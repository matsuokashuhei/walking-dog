//! `SeaORM` Entity for dog_members table

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "dog_members")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub dog_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::dogs::Entity",
        from = "Column::DogId",
        to = "super::dogs::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Dogs,
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Users,
}

impl Related<super::dogs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Dogs.def()
    }
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelatedEntity)]
pub enum RelatedEntity {
    #[sea_orm(entity = "super::dogs::Entity")]
    Dogs,
    #[sea_orm(entity = "super::users::Entity")]
    Users,
}
