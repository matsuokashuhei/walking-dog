use async_graphql::EmptySubscription;
use walking_dog::graphql::{mutation::Mutation, query::Query};

#[test]
fn schema_exposes_passwordless_auth_mutations() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    let sdl = schema.sdl();

    assert!(sdl.contains(
        "requestOneTimePassword(input: RequestOneTimePasswordInput!): RequestOneTimePasswordOutput!"
    ));
    assert!(sdl.contains(
        "verifyOneTimePassword(input: VerifyOneTimePasswordInput!): VerifyOneTimePasswordOutput!"
    ));
    assert!(!sdl.contains("signUp"));
    assert!(!sdl.contains("signIn"));
    assert!(!sdl.contains("SignUpInput"));
    assert!(!sdl.contains("SignInInput"));
    assert!(!sdl.contains("OneTimePasswordPurpose"));
    assert!(!sdl.contains("SIGN_UP"));
    assert!(!sdl.contains("SIGN_IN"));
}

#[test]
fn schema_removes_password_lifecycle_mutations() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    let sdl = schema.sdl();

    assert!(!sdl.contains("confirmSignUp"));
    assert!(!sdl.contains("forgotPassword"));
    assert!(!sdl.contains("confirmForgotPassword"));
    assert!(!sdl.contains("changePassword"));
    assert!(!sdl.contains("password: String!"));
    assert!(!sdl.contains("newPassword"));
    assert!(!sdl.contains("oldPassword"));
}
