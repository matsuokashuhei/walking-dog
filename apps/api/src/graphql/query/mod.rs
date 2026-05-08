mod user;
mod walk;

use async_graphql::MergedObject;
use user::UserQuery;
use walk::WalkQuery;

#[derive(MergedObject, Default)]
pub struct Query(UserQuery, WalkQuery);
