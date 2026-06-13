#![recursion_limit = "256"]

use std::sync::{Arc, Mutex};

use async_graphql::{Context, EmptyMutation, EmptySubscription, Object, Request, Schema, Variables};
use async_trait::async_trait;
use chrono::TimeZone;
use serde_json::json;
use uuid::Uuid;
use walking_dog::{
    entity::user,
    graphql::{
        attach_request_context,
        mutation::Mutation,
        query::Query,
        AuthAccessToken,
    },
    service::auth::{AuthGateway, AuthGatewayError, AuthTokenPair, SharedAuthGateway, SignUpResult},
};

#[derive(Clone, Debug, PartialEq, Eq)]
enum AuthCall {
    ChangePassword {
        access_token: String,
        old_password: String,
        new_password: String,
    },
    SignOut {
        access_token: String,
    },
}

#[derive(Default)]
struct RecordingAuthGateway {
    calls: Arc<Mutex<Vec<AuthCall>>>,
}

#[async_trait]
impl AuthGateway for RecordingAuthGateway {
    async fn sign_up(
        &self,
        _email: String,
        _password: String,
    ) -> Result<SignUpResult, AuthGatewayError> {
        unimplemented!("change password mutation should not sign up")
    }

    async fn confirm_sign_up(&self, _email: String, _code: String) -> Result<(), AuthGatewayError> {
        unimplemented!("change password mutation should not confirm sign up")
    }

    async fn sign_in(
        &self,
        _email: String,
        _password: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        unimplemented!("change password mutation should not sign in")
    }

    async fn refresh_token(
        &self,
        _refresh_token: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        unimplemented!("change password mutation should not refresh tokens")
    }

    async fn sign_out(&self, access_token: &str) -> Result<(), AuthGatewayError> {
        self.calls.lock().unwrap().push(AuthCall::SignOut {
            access_token: access_token.to_owned(),
        });
        Ok(())
    }

    async fn forgot_password(&self, _email: String) -> Result<(), AuthGatewayError> {
        unimplemented!("change password mutation should not start forgot password")
    }

    async fn confirm_forgot_password(
        &self,
        _email: String,
        _code: String,
        _new_password: String,
    ) -> Result<(), AuthGatewayError> {
        unimplemented!("change password mutation should not confirm forgot password")
    }

    async fn change_email(
        &self,
        _access_token: &str,
        _new_email: String,
    ) -> Result<(), AuthGatewayError> {
        unimplemented!("change password mutation should not change email")
    }

    async fn confirm_email_change(
        &self,
        _access_token: &str,
        _code: String,
    ) -> Result<(), AuthGatewayError> {
        unimplemented!("change password mutation should not confirm email")
    }

    async fn change_password(
        &self,
        access_token: &str,
        old_password: String,
        new_password: String,
    ) -> Result<(), AuthGatewayError> {
        self.calls.lock().unwrap().push(AuthCall::ChangePassword {
            access_token: access_token.to_owned(),
            old_password,
            new_password,
        });
        Ok(())
    }
}

struct TokenQuery;

#[Object]
impl TokenQuery {
    async fn token(&self, ctx: &Context<'_>) -> async_graphql::Result<String> {
        Ok(ctx.data::<AuthAccessToken>()?.token().to_owned())
    }
}

fn fixed_time() -> sea_orm::prelude::DateTimeWithTimeZone {
    chrono::Utc
        .with_ymd_and_hms(2026, 6, 13, 9, 0, 0)
        .single()
        .unwrap()
        .into()
}

fn user_model() -> user::Model {
    user::Model {
        id: Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap(),
        name: Some("Mio Tanaka".to_owned()),
        avatar: None,
        cognito_sub: "owner-sub".to_owned(),
        created_at: fixed_time(),
        updated_at: fixed_time(),
    }
}

#[tokio::test]
async fn request_context_attaches_access_token_for_resolvers() {
    let schema = Schema::build(TokenQuery, EmptyMutation, EmptySubscription).finish();
    let request = attach_request_context(
        Request::new("{ token }"),
        Some(user_model()),
        Some(AuthAccessToken::new("access-token")),
    );

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({ "token": "access-token" })
    );
}

#[tokio::test]
async fn change_password_uses_access_token_then_signs_out_globally() {
    let gateway = RecordingAuthGateway::default();
    let calls = gateway.calls.clone();
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(Arc::new(gateway) as SharedAuthGateway)
        .finish();
    let request = Request::new(
        r#"
        mutation ChangePassword($input: ChangePasswordInput!) {
          changePassword(input: $input) {
            success
          }
        }
        "#,
    )
    .variables(Variables::from_json(json!({
        "input": {
            "oldPassword": "Currentpass1",
            "newPassword": "Newpass1"
        }
    })));
    let request = attach_request_context(
        request,
        Some(user_model()),
        Some(AuthAccessToken::new("access-token")),
    );

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({ "changePassword": { "success": true } })
    );
    assert_eq!(
        *calls.lock().unwrap(),
        vec![
            AuthCall::ChangePassword {
                access_token: "access-token".to_owned(),
                old_password: "Currentpass1".to_owned(),
                new_password: "Newpass1".to_owned(),
            },
            AuthCall::SignOut {
                access_token: "access-token".to_owned(),
            },
        ]
    );
}
