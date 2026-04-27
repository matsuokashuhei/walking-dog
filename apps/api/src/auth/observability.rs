pub fn on_authentication_success(cognito_sub: &str) {
    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: Some(cognito_sub.to_string()),
            ..Default::default()
        }));
    });
}
