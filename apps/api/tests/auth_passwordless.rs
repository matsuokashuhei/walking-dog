#![recursion_limit = "256"]

use std::sync::{Arc, Mutex};

use async_graphql::{
    Context, EmptyMutation, EmptySubscription, Object, Request, Schema, Variables,
};
use async_trait::async_trait;
use chrono::TimeZone;
use sea_orm::{DatabaseBackend, MockDatabase};
use serde_json::json;
use uuid::Uuid;
use walking_dog::{
    entity::user,
    graphql::{AuthAccessToken, attach_request_context, mutation::Mutation, query::Query},
    service::auth::{
        AuthGateway, AuthGatewayError, AuthTokenPair, EmailChangeChallenge,
        EmailChangeConfirmation, OneTimePasswordChallenge, RequestOneTimePasswordResult,
        SharedAuthGateway,
    },
};

#[derive(Clone, Debug, PartialEq, Eq)]
enum AuthCall {
    CurrentEmail {
        access_token: String,
    },
    RequestOneTimePassword {
        email: String,
    },
    VerifyOneTimePassword {
        email: String,
        session: String,
        code: String,
    },
    ChangeEmail {
        access_token: String,
        new_email: String,
    },
    ConfirmEmailChange {
        access_token: String,
        code: String,
    },
}

#[derive(Default)]
struct RecordingAuthGateway {
    calls: Arc<Mutex<Vec<AuthCall>>>,
    created_user_sub: Option<String>,
    current_email: String,
}

#[async_trait]
impl AuthGateway for RecordingAuthGateway {
    async fn current_email(&self, access_token: &str) -> Result<String, AuthGatewayError> {
        self.calls.lock().unwrap().push(AuthCall::CurrentEmail {
            access_token: access_token.to_owned(),
        });
        Ok(self.current_email.clone())
    }

    async fn request_one_time_password(
        &self,
        email: String,
    ) -> Result<RequestOneTimePasswordResult, AuthGatewayError> {
        self.calls
            .lock()
            .unwrap()
            .push(AuthCall::RequestOneTimePassword {
                email: email.clone(),
            });
        Ok(RequestOneTimePasswordResult {
            created_user_sub: self.created_user_sub.clone(),
            challenge: OneTimePasswordChallenge {
                email,
                session: "otp-session".to_owned(),
                code_length: 8,
            },
        })
    }

    async fn verify_one_time_password(
        &self,
        email: String,
        session: String,
        code: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        self.calls
            .lock()
            .unwrap()
            .push(AuthCall::VerifyOneTimePassword {
                email,
                session,
                code,
            });
        Ok(AuthTokenPair {
            access_token: "access-token".to_owned(),
            refresh_token: "refresh-token".to_owned(),
        })
    }

    async fn refresh_token(
        &self,
        _refresh_token: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        unimplemented!("passwordless tests should not refresh tokens")
    }

    async fn sign_out(&self, _access_token: &str) -> Result<(), AuthGatewayError> {
        unimplemented!("passwordless tests should not sign out")
    }

    async fn change_email(
        &self,
        access_token: &str,
        new_email: String,
    ) -> Result<EmailChangeChallenge, AuthGatewayError> {
        self.calls.lock().unwrap().push(AuthCall::ChangeEmail {
            access_token: access_token.to_owned(),
            new_email: new_email.clone(),
        });
        Ok(EmailChangeChallenge {
            email: new_email,
            code_length: 6,
        })
    }

    async fn confirm_email_change(
        &self,
        access_token: &str,
        code: String,
    ) -> Result<EmailChangeConfirmation, AuthGatewayError> {
        self.calls
            .lock()
            .unwrap()
            .push(AuthCall::ConfirmEmailChange {
                access_token: access_token.to_owned(),
                code,
            });
        Ok(EmailChangeConfirmation {
            email: self.current_email.clone(),
        })
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

fn authenticated_request(query: &str) -> Request {
    attach_request_context(
        Request::new(query),
        Some(user_model()),
        Some(AuthAccessToken::new("access-token")),
    )
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
async fn request_one_time_password_starts_challenge_and_stores_new_user_without_name() {
    let gateway = RecordingAuthGateway {
        created_user_sub: Some("owner-sub".to_owned()),
        ..Default::default()
    };
    let calls = gateway.calls.clone();
    let db = MockDatabase::new(DatabaseBackend::Postgres)
        .append_query_results([[user_model()]])
        .into_connection();
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(Arc::new(gateway) as SharedAuthGateway)
        .data(db.clone())
        .finish();
    let request = Request::new(
        r#"
        mutation RequestOneTimePassword($input: RequestOneTimePasswordInput!) {
          requestOneTimePassword(input: $input) {
            email
            session
            codeLength
          }
        }
        "#,
    )
    .variables(Variables::from_json(json!({
        "input": {
            "email": "mio@example.com"
        }
    })));

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({
            "requestOneTimePassword": {
                "email": "mio@example.com",
                "session": "otp-session",
                "codeLength": 8
            }
        })
    );
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::RequestOneTimePassword {
            email: "mio@example.com".to_owned(),
        }]
    );
    let log = db.into_transaction_log();
    let insert_sql = log[0].statements()[0].sql.to_lowercase();
    assert!(insert_sql.contains("insert"));
    assert!(insert_sql.contains("name"));
}

#[tokio::test]
async fn request_one_time_password_skips_user_insert_for_existing_cognito_user() {
    let gateway = RecordingAuthGateway::default();
    let calls = gateway.calls.clone();
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(Arc::new(gateway) as SharedAuthGateway)
        .finish();
    let request = Request::new(
        r#"
        mutation RequestOneTimePassword($input: RequestOneTimePasswordInput!) {
          requestOneTimePassword(input: $input) {
            email
            session
            codeLength
          }
        }
        "#,
    )
    .variables(Variables::from_json(json!({
        "input": {
            "email": "mio@example.com"
        }
    })));

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({
            "requestOneTimePassword": {
                "email": "mio@example.com",
                "session": "otp-session",
                "codeLength": 8
            }
        })
    );
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::RequestOneTimePassword {
            email: "mio@example.com".to_owned(),
        }]
    );
}

#[tokio::test]
async fn verify_one_time_password_returns_tokens() {
    let gateway = RecordingAuthGateway::default();
    let calls = gateway.calls.clone();
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(Arc::new(gateway) as SharedAuthGateway)
        .finish();
    let request = Request::new(
        r#"
        mutation VerifyOneTimePassword($input: VerifyOneTimePasswordInput!) {
          verifyOneTimePassword(input: $input) {
            accessToken
            refreshToken
          }
        }
        "#,
    )
    .variables(Variables::from_json(json!({
        "input": {
            "email": "mio@example.com",
            "session": "otp-session",
            "code": "123456"
        }
    })));

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({
            "verifyOneTimePassword": {
                "accessToken": "access-token",
                "refreshToken": "refresh-token"
            }
        })
    );
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::VerifyOneTimePassword {
            email: "mio@example.com".to_owned(),
            session: "otp-session".to_owned(),
            code: "123456".to_owned(),
        }]
    );
}

#[tokio::test]
async fn user_query_resolves_current_login_email_from_auth_gateway() {
    let gateway = RecordingAuthGateway {
        current_email: "mio@walk.app".to_owned(),
        ..Default::default()
    };
    let calls = gateway.calls.clone();
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(Arc::new(gateway) as SharedAuthGateway)
        .finish();
    let request = authenticated_request(
        r#"
        query User {
          user {
            id
            email
          }
        }
        "#,
    );

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({
            "user": {
                "id": "019e0dc4-066b-7a22-b755-969ee6beb5e9",
                "email": "mio@walk.app"
            }
        })
    );
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::CurrentEmail {
            access_token: "access-token".to_owned(),
        }]
    );
}

#[tokio::test]
async fn change_email_returns_confirmation_destination_and_code_length() {
    let gateway = RecordingAuthGateway::default();
    let calls = gateway.calls.clone();
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(Arc::new(gateway) as SharedAuthGateway)
        .finish();
    let request = authenticated_request(
        r#"
        mutation ChangeEmail($input: ChangeEmailInput!) {
          changeEmail(input: $input) {
            email
            codeLength
          }
        }
        "#,
    )
    .variables(Variables::from_json(json!({
        "input": {
            "newEmail": "new-mio@walk.app"
        }
    })));

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({
            "changeEmail": {
                "email": "new-mio@walk.app",
                "codeLength": 6
            }
        })
    );
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::ChangeEmail {
            access_token: "access-token".to_owned(),
            new_email: "new-mio@walk.app".to_owned(),
        }]
    );
}

#[tokio::test]
async fn confirm_email_change_returns_confirmed_login_email() {
    let gateway = RecordingAuthGateway {
        current_email: "new-mio@walk.app".to_owned(),
        ..Default::default()
    };
    let calls = gateway.calls.clone();
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(Arc::new(gateway) as SharedAuthGateway)
        .finish();
    let request = authenticated_request(
        r#"
        mutation ConfirmEmailChange($input: ConfirmEmailChangeInput!) {
          confirmEmailChange(input: $input) {
            email
          }
        }
        "#,
    )
    .variables(Variables::from_json(json!({
        "input": {
            "code": "123456"
        }
    })));

    let response = schema.execute(request).await;

    assert!(response.errors.is_empty(), "{:?}", response.errors);
    assert_eq!(
        response.data.into_json().unwrap(),
        json!({
            "confirmEmailChange": {
                "email": "new-mio@walk.app"
            }
        })
    );
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::ConfirmEmailChange {
            access_token: "access-token".to_owned(),
            code: "123456".to_owned(),
        }]
    );
}
