//! `SeaORM` Entity for dog_invitations table

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "dog_invitations")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub dog_id: Uuid,
    #[sea_orm(column_type = "String(StringLen::N(64))")]
    pub token: String,
    pub invited_by: Uuid,
    pub used_by: Option<Uuid>,
    pub expires_at: DateTimeWithTimeZone,
    pub used_at: Option<DateTimeWithTimeZone>,
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
}

impl Related<super::dogs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Dogs.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelatedEntity)]
pub enum RelatedEntity {
    #[sea_orm(entity = "super::dogs::Entity")]
    Dogs,
}
