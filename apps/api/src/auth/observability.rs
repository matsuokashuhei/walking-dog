use super::AuthUser;

pub fn on_authentication_success(auth_user: &AuthUser) {
    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: Some(auth_user.cognito_sub.clone()),
            ..Default::default()
        }));
    });
}
