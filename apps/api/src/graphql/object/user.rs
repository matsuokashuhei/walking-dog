use async_graphql::SimpleObject;
use uuid::Uuid;

#[derive(SimpleObject)]
pub struct User {
    pub id: Uuid,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub dogs: Vec<crate::graphql::object::dog::Dog>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<crate::entity::user::Model> for User {
    fn from(model: crate::entity::user::Model) -> Self {
        User {
            id: model.id,
            name: model.name,
            avatar: model.avatar,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
            dogs: Vec::new(), // Initialize with an empty vector or fetch related dogs if needed
        }
    }
}
