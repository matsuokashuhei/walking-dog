use async_graphql::EmptySubscription;
use walking_dog::graphql::{mutation::Mutation, query::Query};

fn main() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    println!("{}", schema.sdl());
}
