//! `SeaORM` Entity for dog walk goals.

use sea_orm::{ActiveValue::Set, entity::prelude::*};

use crate::entity::{dog, walk_amount};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "dog_walk_goal")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub dog_id: Uuid,
    pub walk_amount: walk_amount::Model,
    pub effective_from: chrono::NaiveDate,
    pub effective_to: Option<chrono::NaiveDate>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    #[sea_orm(
        belongs_to,
        from = "dog_id",
        to = "id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    pub dog: HasOne<dog::Entity>,
}

impl ActiveModelBehavior for ActiveModel {
    fn new() -> Self {
        Self {
            id: Set(Uuid::now_v7()),
            ..ActiveModelTrait::default()
        }
    }
}
