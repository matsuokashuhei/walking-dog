use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "walk_dogs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub walk_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub dog_id: Uuid,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::walks::Entity",
        from = "Column::WalkId",
        to = "super::walks::Column::Id"
    )]
    Walk,
    #[sea_orm(
        belongs_to = "super::dogs::Entity",
        from = "Column::DogId",
        to = "super::dogs::Column::Id"
    )]
    Dog,
}

impl ActiveModelBehavior for ActiveModel {}
