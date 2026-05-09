mod dog;
mod user;
mod walk;

use async_graphql::MergedObject;
use dog::DogQuery;
use user::UserQuery;
pub use walk::WalkQuery;

#[derive(MergedObject, Default)]
pub struct Query(DogQuery, UserQuery, WalkQuery);
