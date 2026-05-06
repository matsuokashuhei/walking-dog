use async_graphql::SimpleObject;
use uuid::Uuid;

#[derive(SimpleObject)]
pub struct User {
    pub id: Uuid,
    pub name: Option<String>,
    pub avatar: Option<String>,
}

impl From<crate::entity::user::Model> for User {
    fn from(model: crate::entity::user::Model) -> Self {
        User {
            id: model.id,
            name: model.name,
            avatar: model.avatar,
        }
    }
}
