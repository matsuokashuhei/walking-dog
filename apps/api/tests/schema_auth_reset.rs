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
    assert!(sdl.contains("codeLength: Int!"));
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
    assert!(!sdl.contains("ChangePassword"));
    assert!(!sdl.contains("changePassword"));
}

#[test]
fn schema_exposes_email_change_without_legacy_success_flags() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    let sdl = schema.sdl();

    assert!(sdl.contains("email: String!"));
    assert!(sdl.contains("changeEmail(input: ChangeEmailInput!): ChangeEmailOutput!"));
    assert!(sdl.contains(
        "confirmEmailChange(input: ConfirmEmailChangeInput!): ConfirmEmailChangeOutput!"
    ));
    assert!(sdl.contains("type ChangeEmailOutput"));
    assert!(sdl.contains("codeLength: Int!"));
    assert!(sdl.contains("type ConfirmEmailChangeOutput"));
    assert!(!sdl.contains("type ChangeEmailOutput {\n\tsuccess: Boolean!"));
    assert!(!sdl.contains("type ConfirmEmailChangeOutput {\n\tsuccess: Boolean!"));
}

#[test]
fn schema_allows_initial_walk_goal_when_adding_dog() {
    let schema =
        async_graphql::Schema::build(Query::default(), Mutation::default(), EmptySubscription)
            .finish();
    let sdl = schema.sdl();
    let add_dog_input = sdl
        .split("input AddDogInput {")
        .nth(1)
        .and_then(|tail| tail.split("\n}").next())
        .expect("AddDogInput should be present in the GraphQL schema");

    assert!(add_dog_input.contains("walkGoal: WalkAmountInput"));
}
