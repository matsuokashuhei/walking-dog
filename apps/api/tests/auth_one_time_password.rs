use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::TimeZone;
use sea_orm::{DatabaseBackend, MockDatabase};
use uuid::Uuid;
use walking_dog::{
    entity::auth_challenge,
    service::auth::{
        self, AuthGateway, AuthGatewayError, AuthTokenPair, OneTimePasswordChallenge,
        OneTimePasswordProviderFlow, SharedAuthGateway,
    },
};

#[derive(Clone, Debug, PartialEq, Eq)]
enum AuthCall {
    RequestOneTimePassword {
        email: String,
    },
    VerifyOneTimePassword {
        email: String,
        provider_flow: OneTimePasswordProviderFlow,
        provider_session: String,
        code: String,
    },
}

#[derive(Default)]
struct RecordingAuthGateway {
    calls: Arc<Mutex<Vec<AuthCall>>>,
}

#[async_trait]
impl AuthGateway for RecordingAuthGateway {
    async fn request_one_time_password(
        &self,
        email: String,
    ) -> Result<OneTimePasswordChallenge, AuthGatewayError> {
        self.calls
            .lock()
            .unwrap()
            .push(AuthCall::RequestOneTimePassword { email });
        Ok(OneTimePasswordChallenge {
            provider_flow: OneTimePasswordProviderFlow::SignIn,
            provider_session: "provider-session".to_owned(),
        })
    }

    async fn verify_one_time_password(
        &self,
        email: String,
        provider_flow: OneTimePasswordProviderFlow,
        provider_session: String,
        code: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        self.calls
            .lock()
            .unwrap()
            .push(AuthCall::VerifyOneTimePassword {
                email,
                provider_flow,
                provider_session,
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
        unimplemented!("OneTimePassword tests should not refresh tokens")
    }

    async fn sign_out(&self, _access_token: &str) -> Result<(), AuthGatewayError> {
        unimplemented!("OneTimePassword tests should not sign out")
    }

    async fn change_email(
        &self,
        _access_token: &str,
        _new_email: String,
    ) -> Result<(), AuthGatewayError> {
        unimplemented!("OneTimePassword tests should not change email")
    }

    async fn confirm_email_change(
        &self,
        _access_token: &str,
        _code: String,
    ) -> Result<(), AuthGatewayError> {
        unimplemented!("OneTimePassword tests should not confirm email")
    }
}

fn fixed_time() -> sea_orm::prelude::DateTimeWithTimeZone {
    chrono::Utc
        .with_ymd_and_hms(2026, 6, 14, 9, 0, 0)
        .single()
        .unwrap()
        .into()
}

fn challenge_model(
    id: Uuid,
    consumed_at: Option<sea_orm::prelude::DateTimeWithTimeZone>,
) -> auth_challenge::Model {
    auth_challenge::Model {
        id,
        email: "owner@example.com".to_owned(),
        provider_flow: "sign_in".to_owned(),
        provider_session: "provider-session".to_owned(),
        expires_at: chrono::Utc
            .with_ymd_and_hms(2099, 6, 14, 9, 10, 0)
            .single()
            .unwrap()
            .into(),
        consumed_at,
        created_at: fixed_time(),
        updated_at: fixed_time(),
    }
}

#[tokio::test]
async fn request_one_time_password_stores_provider_session_and_returns_challenge_id() {
    let challenge_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
    let gateway = RecordingAuthGateway::default();
    let calls = gateway.calls.clone();
    let db = MockDatabase::new(DatabaseBackend::Postgres)
        .append_query_results([[challenge_model(challenge_id, None)]])
        .into_connection();

    let result = auth::request_one_time_password(
        &db,
        &(Arc::new(gateway) as SharedAuthGateway),
        "owner@example.com".to_owned(),
    )
    .await
    .unwrap();

    assert_eq!(result.challenge_id, challenge_id);
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::RequestOneTimePassword {
            email: "owner@example.com".to_owned(),
        }]
    );
}

#[tokio::test]
async fn verify_one_time_password_consumes_challenge_and_returns_tokens() {
    let challenge_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
    let gateway = RecordingAuthGateway::default();
    let calls = gateway.calls.clone();
    let db = MockDatabase::new(DatabaseBackend::Postgres)
        .append_query_results([[challenge_model(challenge_id, None)]])
        .append_query_results([[challenge_model(challenge_id, Some(fixed_time()))]])
        .into_connection();

    let result = auth::verify_one_time_password(
        &db,
        &(Arc::new(gateway) as SharedAuthGateway),
        challenge_id,
        "123456".to_owned(),
    )
    .await
    .unwrap();

    assert_eq!(result.access_token, "access-token");
    assert_eq!(result.refresh_token, "refresh-token");
    assert_eq!(
        *calls.lock().unwrap(),
        vec![AuthCall::VerifyOneTimePassword {
            email: "owner@example.com".to_owned(),
            provider_flow: OneTimePasswordProviderFlow::SignIn,
            provider_session: "provider-session".to_owned(),
            code: "123456".to_owned(),
        }]
    );
}

#[tokio::test]
async fn verify_one_time_password_rejects_consumed_challenge_without_provider_call() {
    let challenge_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
    let gateway = RecordingAuthGateway::default();
    let calls = gateway.calls.clone();
    let db = MockDatabase::new(DatabaseBackend::Postgres)
        .append_query_results([[challenge_model(challenge_id, Some(fixed_time()))]])
        .into_connection();

    let error = auth::verify_one_time_password(
        &db,
        &(Arc::new(gateway) as SharedAuthGateway),
        challenge_id,
        "123456".to_owned(),
    )
    .await
    .expect_err("consumed challenges must be rejected");

    assert_eq!(error.provider_message(), "INVALID_CODE");
    assert!(calls.lock().unwrap().is_empty());
}
