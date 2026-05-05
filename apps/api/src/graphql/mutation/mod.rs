use async_graphql::MergedObject;

pub mod caretaker;

#[derive(MergedObject, Default)]
pub struct Mutation(caretaker::CaretakerMutation);
