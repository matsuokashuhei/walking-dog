//! DynamoDB-backed entity shaped like a `SeaORM` Entity.

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "track_points")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub walk_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub recorded_at: DateTime,
    #[sea_orm(column_type = "Double")]
    pub latitude: f64,
    #[sea_orm(column_type = "Double")]
    pub longitude: f64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::walks::Entity",
        from = "Column::WalkId",
        to = "super::walks::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Walks,
}

impl Related<super::walks::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Walks.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelatedEntity)]
pub enum RelatedEntity {
    #[sea_orm(entity = "super::walks::Entity")]
    Walks,
}
