use async_graphql::SimpleObject;

#[derive(SimpleObject)]
pub struct Caretaker {
    id: String,
    name: String,
}

impl From<crate::entity::caretakers::Model> for Caretaker {
    fn from(model: crate::entity::caretakers::Model) -> Self {
        Caretaker {
            id: model.id.to_string(),
            name: model.name,
        }
    }
}
