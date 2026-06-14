use async_graphql::EmptySubscription;
use walking_dog::graphql::{mutation::Mutation, query::Query};

#[test]
fn schema_exposes_one_time_password_mutations() {
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
    assert!(sdl.contains("input RequestOneTimePasswordInput"));
    assert!(sdl.contains("input VerifyOneTimePasswordInput"));
    assert!(sdl.contains("type RequestOneTimePasswordOutput"));
    assert!(sdl.contains("type VerifyOneTimePasswordOutput"));
}

#[test]
fn schema_removes_password_based_auth_mutations() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    let sdl = schema.sdl();

    assert!(!sdl.contains("signUp(input: SignUpInput!)"));
    assert!(!sdl.contains("signIn(input: SignInInput!)"));
    assert!(!sdl.contains("forgotPassword(input: ForgotPasswordInput!)"));
    assert!(!sdl.contains("confirmForgotPassword(input: ConfirmForgotPasswordInput!)"));
    assert!(!sdl.contains("changePassword(input: ChangePasswordInput!)"));
    assert!(!sdl.contains("input SignUpInput"));
    assert!(!sdl.contains("input SignInInput"));
    assert!(!sdl.contains("input ForgotPasswordInput"));
    assert!(!sdl.contains("input ConfirmForgotPasswordInput"));
    assert!(!sdl.contains("input ChangePasswordInput"));
}
