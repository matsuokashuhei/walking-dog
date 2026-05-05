pub mod object;
pub mod query;

use crate::graphql::query::Query;
use async_graphql::{EmptyMutation, EmptySubscription};

pub async fn build_schema() -> async_graphql::Schema<Query, EmptyMutation, EmptySubscription> {
    let db = sea_orm::Database::connect(std::env::var("DATABASE_URL").unwrap())
        .await
        .unwrap();
    async_graphql::Schema::build(Query::default(), EmptyMutation, EmptySubscription)
        .data(db)
        .finish()
}
