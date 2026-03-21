use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "walks")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub status: String,
    pub distance_m: Option<i32>,
    pub duration_sec: Option<i32>,
    pub started_at: DateTimeWithTimeZone,
    pub ended_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::Id"
    )]
    User,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef { Relation::User.def() }
}

impl Related<super::dogs::Entity> for Entity {
    fn to() -> RelationDef {
        super::walk_dogs::Relation::Walk.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}
