pub mod auth;
pub mod dog;
pub mod user;
pub mod walk;

use async_graphql::MergedObject;

#[derive(MergedObject, Default)]
pub struct Mutation(
    auth::AuthMutation,
    dog::DogMutation,
    user::UserMutation,
    walk::WalkMutation,
);
