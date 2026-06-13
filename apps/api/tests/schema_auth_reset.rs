use async_graphql::EmptySubscription;
use walking_dog::graphql::{mutation::Mutation, query::Query};

#[test]
fn schema_exposes_password_reset_mutations() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    let sdl = schema.sdl();

    assert!(sdl.contains("forgotPassword(input: ForgotPasswordInput!): ForgotPasswordOutput!"));
    assert!(sdl.contains(
        "confirmForgotPassword(input: ConfirmForgotPasswordInput!): ConfirmForgotPasswordOutput!"
    ));
    assert!(sdl.contains("input ForgotPasswordInput"));
    assert!(sdl.contains("input ConfirmForgotPasswordInput"));
}

#[test]
fn schema_exposes_change_password_mutation() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    let sdl = schema.sdl();

    assert!(sdl.contains("changePassword(input: ChangePasswordInput!): ChangePasswordOutput!"));
    assert!(sdl.contains("input ChangePasswordInput"));
    assert!(sdl.contains("type ChangePasswordOutput"));
}
