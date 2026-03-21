use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub cognito_sub: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::dogs::Entity")]
    Dogs,
    #[sea_orm(has_many = "super::walks::Entity")]
    Walks,
}

impl Related<super::dogs::Entity> for Entity {
    fn to() -> RelationDef { Relation::Dogs.def() }
}

impl Related<super::walks::Entity> for Entity {
    fn to() -> RelationDef { Relation::Walks.def() }
}

impl ActiveModelBehavior for ActiveModel {}
