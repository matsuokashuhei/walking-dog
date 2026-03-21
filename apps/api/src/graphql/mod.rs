use async_graphql::{EmptySubscription, MergedObject, Schema};
use query::{user::UserQuery, dog::DogQuery, walk::WalkQuery};
use mutation::{user::UserMutation, dog::DogMutation, walk::WalkMutation};

pub mod context;
pub mod mutation;
pub mod query;
pub mod types;

#[derive(MergedObject, Default)]
pub struct QueryRoot(UserQuery, DogQuery, WalkQuery);

#[derive(MergedObject, Default)]
pub struct MutationRoot(UserMutation, DogMutation, WalkMutation);

pub type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;
