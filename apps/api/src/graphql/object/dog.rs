use async_graphql::{Enum, SimpleObject};

use crate::entity::sea_orm_active_enums::GenderType;

#[derive(Enum, Debug, Copy, Clone, Eq, PartialEq)]
pub enum Gender {
    Male,
    Female,
    Other,
}

impl From<GenderType> for Gender {
    fn from(gender_type: GenderType) -> Self {
        match gender_type {
            GenderType::Male => Gender::Male,
            GenderType::Female => Gender::Female,
            GenderType::Other => Gender::Other,
        }
    }
}

#[derive(SimpleObject)]
pub struct Dog {
    pub id: uuid::Uuid,
    pub name: String,
    pub breed: Option<String>,
    pub gender: Gender,
    pub avatar: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<crate::entity::dog::Model> for Dog {
    fn from(model: crate::entity::dog::Model) -> Self {
        Dog {
            id: model.id,
            name: model.name,
            breed: model.breed,
            gender: model.gender.into(),
            avatar: model.avatar,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}
