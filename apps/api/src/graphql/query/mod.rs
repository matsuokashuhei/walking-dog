pub mod user;

use async_graphql::MergedObject;
use user::UserQuery;

#[derive(MergedObject, Default)]
pub struct Query(UserQuery);
