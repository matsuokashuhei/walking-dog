use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "walk_events")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub walk_id: Uuid,
    pub dog_id: Option<Uuid>,
    pub event_type: String,
    pub occurred_at: DateTimeWithTimeZone,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub photo_url: Option<String>,
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
        from = "Column::DogId",
        to = "super::dogs::Column::Id",
        on_delete = "SetNull"
    )]
    Dog,
}

impl ActiveModelBehavior for ActiveModel {}
