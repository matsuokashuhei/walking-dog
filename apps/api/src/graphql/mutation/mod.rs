pub mod auth;
pub mod user;

use async_graphql::MergedObject;

#[derive(MergedObject, Default)]
pub struct Mutation(auth::AuthMutation, user::UserMutation);
