use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "encounters")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub walk_id: Uuid,
    pub dog_id_1: Uuid,
    pub dog_id_2: Uuid,
    pub duration_sec: i32,
    pub met_at: DateTimeWithTimeZone,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::walks::Entity",
        from = "Column::WalkId",
        to = "super::walks::Column::Id",
        on_delete = "Cascade"
    )]
    Walk,
    #[sea_orm(
        belongs_to = "super::dogs::Entity",
        from = "Column::DogId1",
        to = "super::dogs::Column::Id",
        on_delete = "Cascade"
    )]
    Dog1,
    #[sea_orm(
        belongs_to = "super::dogs::Entity",
        from = "Column::DogId2",
        to = "super::dogs::Column::Id",
        on_delete = "Cascade"
    )]
    Dog2,
}

impl ActiveModelBehavior for ActiveModel {}
