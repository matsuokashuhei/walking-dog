use async_trait::async_trait;
use aws_sdk_cognitoidentityprovider::{
    Client,
    error::ProvideErrorMetadata,
    operation::{
        confirm_sign_up::ConfirmSignUpError,
        get_tokens_from_refresh_token::GetTokensFromRefreshTokenError,
        global_sign_out::GlobalSignOutError, initiate_auth::InitiateAuthError,
        respond_to_auth_challenge::RespondToAuthChallengeError, sign_up::SignUpError,
        update_user_attributes::UpdateUserAttributesError,
        verify_user_attribute::VerifyUserAttributeError,
    },
    types::{AttributeType, AuthFlowType, ChallengeNameType},
};
use chrono::{Duration, Utc};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, DatabaseConnection, EntityTrait};
use serde::Deserialize;
use std::{fmt, sync::Arc};
use tracing::warn;
use uuid::Uuid;

use crate::entity::auth_challenge;

pub type SharedAuthGateway = Arc<dyn AuthGateway>;

const ONE_TIME_PASSWORD_CHALLENGE_TTL_MINUTES: i64 = 10;
const LOCAL_ONE_TIME_PASSWORD_PROVIDER_SESSION: &str = "local-cognito-one-time-password";
const LOCAL_COGNITO_COMPAT_SECRET: &str = "WalkingDogLocalSecret1";

#[async_trait]
pub trait AuthGateway: Send + Sync + 'static {
    async fn request_one_time_password(
        &self,
        email: String,
    ) -> Result<OneTimePasswordChallenge, AuthGatewayError>;
    async fn verify_one_time_password(
        &self,
        email: String,
        provider_flow: OneTimePasswordProviderFlow,
        provider_session: String,
        code: String,
    ) -> Result<AuthTokenPair, AuthGatewayError>;
    async fn refresh_token(&self, refresh_token: String)
    -> Result<AuthTokenPair, AuthGatewayError>;
    async fn sign_out(&self, access_token: &str) -> Result<(), AuthGatewayError>;
    async fn change_email(
        &self,
        access_token: &str,
        new_email: String,
    ) -> Result<(), AuthGatewayError>;
    async fn confirm_email_change(
        &self,
        access_token: &str,
        code: String,
    ) -> Result<(), AuthGatewayError>;
}

pub struct CognitoAuthGateway {
    client: Client,
    client_id: String,
    skip_global_sign_out: bool,
    use_local_one_time_password: bool,
}

impl CognitoAuthGateway {
    pub fn from_env(client: Client) -> anyhow::Result<Self> {
        let cognito_endpoint = std::env::var("AWS_COGNITO_ENDPOINT").ok();
        let is_local_endpoint = cognito_endpoint
            .as_deref()
            .is_some_and(is_local_cognito_endpoint);
        Ok(Self {
            client,
            client_id: std::env::var("AWS_COGNITO_CLIENT_ID")?,
            skip_global_sign_out: is_local_endpoint,
            use_local_one_time_password: is_local_endpoint,
        })
    }
}

fn is_local_cognito_endpoint(endpoint: &str) -> bool {
    endpoint.contains("cognito-local")
        || endpoint.contains("localhost")
        || endpoint.contains("127.0.0.1")
}

#[async_trait]
impl AuthGateway for CognitoAuthGateway {
    async fn request_one_time_password(
        &self,
        email: String,
    ) -> Result<OneTimePasswordChallenge, AuthGatewayError> {
        if self.use_local_one_time_password {
            return self.request_local_one_time_password(email).await;
        }

        let initiate_result = self
            .client
            .initiate_auth()
            .client_id(&self.client_id)
            .auth_flow(AuthFlowType::UserAuth)
            .auth_parameters("USERNAME", email.clone())
            .auth_parameters("PREFERRED_CHALLENGE", "EMAIL_OTP")
            .send()
            .await;

        match initiate_result {
            Ok(output) => {
                let provider_session = output.session.ok_or_else(|| {
                    AuthGatewayError::missing_provider_token(
                        AuthOperation::RequestOneTimePassword,
                        "provider session",
                    )
                })?;
                Ok(OneTimePasswordChallenge {
                    provider_flow: OneTimePasswordProviderFlow::SignIn,
                    provider_session,
                })
            }
            Err(error) => {
                let service_error = error.into_service_error();
                if is_user_not_found(&service_error) {
                    return self.sign_up_with_one_time_password(email).await;
                }
                Err(AuthGatewayError::from_request_one_time_password_error(
                    service_error,
                ))
            }
        }
    }

    async fn verify_one_time_password(
        &self,
        email: String,
        provider_flow: OneTimePasswordProviderFlow,
        provider_session: String,
        code: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        match provider_flow {
            OneTimePasswordProviderFlow::SignIn => {
                let output = self
                    .client
                    .respond_to_auth_challenge()
                    .client_id(&self.client_id)
                    .challenge_name(ChallengeNameType::EmailOtp)
                    .challenge_responses("USERNAME", email)
                    .challenge_responses("EMAIL_OTP_CODE", code)
                    .session(provider_session)
                    .send()
                    .await
                    .map_err(|error| {
                        AuthGatewayError::from_verify_one_time_password_error(
                            error.into_service_error(),
                        )
                    })?;
                AuthTokenPair::from_auth_result(
                    AuthOperation::VerifyOneTimePassword,
                    output.authentication_result.as_ref(),
                )
            }
            OneTimePasswordProviderFlow::SignUp => {
                let confirm_output = self
                    .client
                    .confirm_sign_up()
                    .client_id(&self.client_id)
                    .username(email)
                    .confirmation_code(code)
                    .session(provider_session)
                    .send()
                    .await
                    .map_err(|error| {
                        AuthGatewayError::from_confirm_sign_up_error(error.into_service_error())
                    })?;
                let confirm_session = confirm_output.session.ok_or_else(|| {
                    AuthGatewayError::missing_provider_token(
                        AuthOperation::VerifyOneTimePassword,
                        "confirmed sign-up session",
                    )
                })?;
                let output = self
                    .client
                    .initiate_auth()
                    .client_id(&self.client_id)
                    .auth_flow(AuthFlowType::UserAuth)
                    .session(confirm_session)
                    .send()
                    .await
                    .map_err(|error| {
                        AuthGatewayError::from_request_one_time_password_error(
                            error.into_service_error(),
                        )
                    })?;
                AuthTokenPair::from_auth_result(
                    AuthOperation::VerifyOneTimePassword,
                    output.authentication_result.as_ref(),
                )
            }
            OneTimePasswordProviderFlow::Local
            | OneTimePasswordProviderFlow::LocalSignIn
            | OneTimePasswordProviderFlow::LocalSignUp => {
                if !self.use_local_one_time_password {
                    return Err(AuthGatewayError::internal(
                        AuthOperation::VerifyOneTimePassword,
                        "local OneTimePassword challenge cannot be verified outside local Cognito"
                            .to_owned(),
                    ));
                }
                if provider_session != LOCAL_ONE_TIME_PASSWORD_PROVIDER_SESSION {
                    return Err(AuthGatewayError::invalid_code(
                        AuthOperation::VerifyOneTimePassword,
                    ));
                }
                self.verify_local_one_time_password(
                    email,
                    code,
                    provider_flow == OneTimePasswordProviderFlow::LocalSignUp,
                )
                .await
            }
        }
    }

    async fn refresh_token(
        &self,
        refresh_token: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        if self.use_local_one_time_password {
            return self.refresh_local_one_time_password(refresh_token).await;
        }

        let output = self
            .client
            .get_tokens_from_refresh_token()
            .client_id(&self.client_id)
            .refresh_token(refresh_token.clone())
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_refresh_token_error(error.into_service_error())
            })?;
        AuthTokenPair::from_auth_result(
            AuthOperation::RefreshToken,
            output.authentication_result.as_ref(),
        )
    }

    async fn sign_out(&self, access_token: &str) -> Result<(), AuthGatewayError> {
        if self.skip_global_sign_out {
            warn!(
                "Skipping Cognito GlobalSignOut because the configured local Cognito endpoint does not implement it"
            );
            return Ok(());
        }

        self.client
            .global_sign_out()
            .access_token(access_token)
            .send()
            .await
            .map_err(|error| AuthGatewayError::from_sign_out_error(error.into_service_error()))?;
        Ok(())
    }

    async fn change_email(
        &self,
        access_token: &str,
        new_email: String,
    ) -> Result<(), AuthGatewayError> {
        self.client
            .update_user_attributes()
            .access_token(access_token)
            .user_attributes(
                AttributeType::builder()
                    .name("email")
                    .value(new_email)
                    .build()
                    .expect("email user attribute is valid"),
            )
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_update_user_attributes_error(error.into_service_error())
            })?;
        Ok(())
    }

    async fn confirm_email_change(
        &self,
        access_token: &str,
        code: String,
    ) -> Result<(), AuthGatewayError> {
        self.client
            .verify_user_attribute()
            .access_token(access_token)
            .attribute_name("email")
            .code(code)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_verify_user_attribute_error(error.into_service_error())
            })?;
        Ok(())
    }
}

impl CognitoAuthGateway {
    async fn request_local_one_time_password(
        &self,
        email: String,
    ) -> Result<OneTimePasswordChallenge, AuthGatewayError> {
        let sign_up_result = self
            .client
            .sign_up()
            .client_id(&self.client_id)
            .username(email.clone())
            .password(LOCAL_COGNITO_COMPAT_SECRET)
            .user_attributes(
                AttributeType::builder()
                    .name("email")
                    .value(email)
                    .build()
                    .expect("email user attribute is valid"),
            )
            .send()
            .await;

        let mut provider_flow = OneTimePasswordProviderFlow::LocalSignUp;
        if let Err(error) = sign_up_result {
            let service_error = error.into_service_error();
            if is_username_exists(&service_error) {
                provider_flow = OneTimePasswordProviderFlow::LocalSignIn;
            } else {
                return Err(AuthGatewayError::from_sign_up_error(service_error));
            }
        }

        Ok(OneTimePasswordChallenge {
            provider_flow,
            provider_session: LOCAL_ONE_TIME_PASSWORD_PROVIDER_SESSION.to_owned(),
        })
    }

    async fn verify_local_one_time_password(
        &self,
        email: String,
        code: String,
        should_confirm_user: bool,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        if code != local_one_time_password_code() {
            return Err(AuthGatewayError::invalid_code(
                AuthOperation::VerifyOneTimePassword,
            ));
        }

        if should_confirm_user {
            self.confirm_local_one_time_password_user(email.clone(), code)
                .await?;
        }

        self.authenticate_local_one_time_password_user(email, AuthOperation::VerifyOneTimePassword)
            .await
    }

    async fn refresh_local_one_time_password(
        &self,
        refresh_token: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        let email = local_refresh_email_from_token(&refresh_token)?;
        self.authenticate_local_one_time_password_user(email, AuthOperation::RefreshToken)
            .await
    }

    async fn authenticate_local_one_time_password_user(
        &self,
        email: String,
        operation: AuthOperation,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        let output = self
            .client
            .initiate_auth()
            .client_id(&self.client_id)
            .auth_flow(AuthFlowType::UserPasswordAuth)
            .auth_parameters("USERNAME", email)
            .auth_parameters("PASSWORD", LOCAL_COGNITO_COMPAT_SECRET)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_local_one_time_password_auth_error(
                    operation,
                    error.into_service_error(),
                )
            })?;

        AuthTokenPair::from_auth_result(operation, output.authentication_result.as_ref())
    }

    async fn confirm_local_one_time_password_user(
        &self,
        email: String,
        code: String,
    ) -> Result<(), AuthGatewayError> {
        let confirm_result = self
            .client
            .confirm_sign_up()
            .client_id(&self.client_id)
            .username(email)
            .confirmation_code(code)
            .send()
            .await;

        match confirm_result {
            Ok(_) => Ok(()),
            Err(error) => {
                let service_error = error.into_service_error();
                if is_user_already_confirmed(&service_error) {
                    Ok(())
                } else {
                    Err(AuthGatewayError::from_confirm_sign_up_error(service_error))
                }
            }
        }
    }

    async fn sign_up_with_one_time_password(
        &self,
        email: String,
    ) -> Result<OneTimePasswordChallenge, AuthGatewayError> {
        let output = self
            .client
            .sign_up()
            .client_id(&self.client_id)
            .username(email.clone())
            .user_attributes(
                AttributeType::builder()
                    .name("email")
                    .value(email)
                    .build()
                    .expect("email user attribute is valid"),
            )
            .send()
            .await
            .map_err(|error| AuthGatewayError::from_sign_up_error(error.into_service_error()))?;
        let provider_session = output.session.ok_or_else(|| {
            AuthGatewayError::missing_provider_token(
                AuthOperation::RequestOneTimePassword,
                "sign-up session",
            )
        })?;
        Ok(OneTimePasswordChallenge {
            provider_flow: OneTimePasswordProviderFlow::SignUp,
            provider_session,
        })
    }
}

#[derive(Debug, Clone)]
pub struct AuthTokenPair {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone)]
pub struct OneTimePasswordChallenge {
    pub provider_flow: OneTimePasswordProviderFlow,
    pub provider_session: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OneTimePasswordProviderFlow {
    SignIn,
    SignUp,
    Local,
    LocalSignIn,
    LocalSignUp,
}

impl OneTimePasswordProviderFlow {
    fn as_str(self) -> &'static str {
        match self {
            OneTimePasswordProviderFlow::SignIn => "sign_in",
            OneTimePasswordProviderFlow::SignUp => "sign_up",
            OneTimePasswordProviderFlow::Local => "local",
            OneTimePasswordProviderFlow::LocalSignIn => "local_sign_in",
            OneTimePasswordProviderFlow::LocalSignUp => "local_sign_up",
        }
    }

    fn from_str(value: &str) -> Option<Self> {
        match value {
            "sign_in" => Some(OneTimePasswordProviderFlow::SignIn),
            "sign_up" => Some(OneTimePasswordProviderFlow::SignUp),
            "local" => Some(OneTimePasswordProviderFlow::Local),
            "local_sign_in" => Some(OneTimePasswordProviderFlow::LocalSignIn),
            "local_sign_up" => Some(OneTimePasswordProviderFlow::LocalSignUp),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestOneTimePasswordResult {
    pub challenge_id: Uuid,
}

pub async fn request_one_time_password(
    db: &DatabaseConnection,
    auth_gateway: &SharedAuthGateway,
    email: String,
) -> Result<RequestOneTimePasswordResult, AuthGatewayError> {
    let challenge = auth_gateway
        .request_one_time_password(email.clone())
        .await?;
    let now = Utc::now();
    let model = auth_challenge::ActiveModel {
        email: Set(email),
        provider_flow: Set(challenge.provider_flow.as_str().to_owned()),
        provider_session: Set(challenge.provider_session),
        expires_at: Set((now + Duration::minutes(ONE_TIME_PASSWORD_CHALLENGE_TTL_MINUTES)).into()),
        created_at: Set(now.into()),
        updated_at: Set(now.into()),
        ..Default::default()
    }
    .insert(db)
    .await
    .map_err(|error| {
        AuthGatewayError::internal(AuthOperation::RequestOneTimePassword, error.to_string())
    })?;

    Ok(RequestOneTimePasswordResult {
        challenge_id: model.id,
    })
}

pub async fn verify_one_time_password(
    db: &DatabaseConnection,
    auth_gateway: &SharedAuthGateway,
    challenge_id: Uuid,
    code: String,
) -> Result<AuthTokenPair, AuthGatewayError> {
    let challenge = auth_challenge::Entity::find_by_id(challenge_id)
        .one(db)
        .await
        .map_err(|error| {
            AuthGatewayError::internal(AuthOperation::VerifyOneTimePassword, error.to_string())
        })?
        .ok_or_else(|| AuthGatewayError::invalid_code(AuthOperation::VerifyOneTimePassword))?;

    let now = Utc::now();
    let now_with_timezone: sea_orm::prelude::DateTimeWithTimeZone = now.into();
    if challenge.consumed_at.is_some() {
        return Err(AuthGatewayError::invalid_code(
            AuthOperation::VerifyOneTimePassword,
        ));
    }
    if challenge.expires_at <= now_with_timezone {
        return Err(AuthGatewayError::expired_code(
            AuthOperation::VerifyOneTimePassword,
        ));
    }
    let provider_flow = OneTimePasswordProviderFlow::from_str(&challenge.provider_flow)
        .ok_or_else(|| {
            AuthGatewayError::internal(
                AuthOperation::VerifyOneTimePassword,
                format!(
                    "unknown OneTimePassword provider flow {}",
                    challenge.provider_flow
                ),
            )
        })?;

    let token_pair = auth_gateway
        .verify_one_time_password(
            challenge.email,
            provider_flow,
            challenge.provider_session,
            code,
        )
        .await?;

    auth_challenge::ActiveModel {
        id: Set(challenge_id),
        consumed_at: Set(Some(now_with_timezone)),
        updated_at: Set(now_with_timezone),
        ..Default::default()
    }
    .update(db)
    .await
    .map_err(|error| {
        AuthGatewayError::internal(AuthOperation::VerifyOneTimePassword, error.to_string())
    })?;

    Ok(token_pair)
}

impl AuthTokenPair {
    fn from_auth_result(
        operation: AuthOperation,
        result: Option<&aws_sdk_cognitoidentityprovider::types::AuthenticationResultType>,
    ) -> Result<Self, AuthGatewayError> {
        let result = result.ok_or_else(|| {
            AuthGatewayError::missing_provider_token(operation, "authentication result")
        })?;
        let access_token = result
            .access_token
            .clone()
            .filter(|token| !token.is_empty())
            .ok_or_else(|| AuthGatewayError::missing_provider_token(operation, "access token"))?;
        let refresh_token = result
            .refresh_token
            .clone()
            .filter(|token| !token.is_empty())
            .ok_or_else(|| AuthGatewayError::missing_provider_token(operation, "refresh token"))?;

        Ok(Self {
            access_token,
            refresh_token,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthOperation {
    RequestOneTimePassword,
    VerifyOneTimePassword,
    RefreshToken,
    SignOut,
    UpdateUserAttributes,
    VerifyUserAttribute,
}

impl fmt::Display for AuthOperation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            AuthOperation::RequestOneTimePassword => "Request one-time password",
            AuthOperation::VerifyOneTimePassword => "Verify one-time password",
            AuthOperation::RefreshToken => "Refresh token",
            AuthOperation::SignOut => "Sign out",
            AuthOperation::UpdateUserAttributes => "Update user attributes",
            AuthOperation::VerifyUserAttribute => "Verify user attribute",
        })
    }
}

#[derive(Debug, thiserror::Error)]
#[error("{operation} error: {message}")]
pub struct AuthGatewayError {
    operation: AuthOperation,
    message: String,
}

impl AuthGatewayError {
    pub fn operation(&self) -> AuthOperation {
        self.operation
    }

    pub fn provider_message(&self) -> &str {
        &self.message
    }

    fn missing_provider_token(operation: AuthOperation, field: &str) -> Self {
        Self {
            operation,
            message: format!("Cognito {operation} response is missing {field}"),
        }
    }

    fn invalid_code(operation: AuthOperation) -> Self {
        Self {
            operation,
            message: "INVALID_CODE".to_owned(),
        }
    }

    fn expired_code(operation: AuthOperation) -> Self {
        Self {
            operation,
            message: "EXPIRED_CODE".to_owned(),
        }
    }

    fn internal(operation: AuthOperation, message: String) -> Self {
        Self { operation, message }
    }

    fn from_provider_error(
        operation: AuthOperation,
        error: impl ProvideErrorMetadata + fmt::Display,
    ) -> Self {
        let message = error
            .message()
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| error.to_string());
        Self { operation, message }
    }

    fn from_sign_up_error(error: SignUpError) -> Self {
        Self::from_provider_error(AuthOperation::RequestOneTimePassword, error)
    }

    fn from_confirm_sign_up_error(error: ConfirmSignUpError) -> Self {
        Self::from_provider_error(AuthOperation::VerifyOneTimePassword, error)
    }

    fn from_request_one_time_password_error(error: InitiateAuthError) -> Self {
        Self::from_provider_error(AuthOperation::RequestOneTimePassword, error)
    }

    fn from_local_one_time_password_auth_error(
        operation: AuthOperation,
        error: InitiateAuthError,
    ) -> Self {
        Self::from_provider_error(operation, error)
    }

    fn from_verify_one_time_password_error(error: RespondToAuthChallengeError) -> Self {
        Self::from_provider_error(AuthOperation::VerifyOneTimePassword, error)
    }

    fn from_refresh_token_error(error: GetTokensFromRefreshTokenError) -> Self {
        Self::from_provider_error(AuthOperation::RefreshToken, error)
    }

    fn from_sign_out_error(error: GlobalSignOutError) -> Self {
        Self::from_provider_error(AuthOperation::SignOut, error)
    }

    fn from_update_user_attributes_error(error: UpdateUserAttributesError) -> Self {
        Self::from_provider_error(AuthOperation::UpdateUserAttributes, error)
    }

    fn from_verify_user_attribute_error(error: VerifyUserAttributeError) -> Self {
        Self::from_provider_error(AuthOperation::VerifyUserAttribute, error)
    }
}

fn is_user_not_found(error: &impl ProvideErrorMetadata) -> bool {
    error.code() == Some("UserNotFoundException")
        || error
            .message()
            .is_some_and(|message| message.contains("UserNotFoundException"))
}

fn is_username_exists(error: &impl ProvideErrorMetadata) -> bool {
    error.code() == Some("UsernameExistsException")
        || error
            .message()
            .is_some_and(|message| message.contains("UsernameExistsException"))
}

fn is_user_already_confirmed(error: &impl ProvideErrorMetadata) -> bool {
    error.message().is_some_and(|message| {
        message.contains("already confirmed") || message.contains("CONFIRMED")
    })
}

fn local_one_time_password_code() -> String {
    std::env::var("COGNITO_LOCAL_ONE_TIME_PASSWORD_CODE")
        .or_else(|_| std::env::var("CODE"))
        .unwrap_or_else(|_| "123456".to_owned())
}

#[derive(Debug, Deserialize)]
struct LocalRefreshTokenClaims {
    email: Option<String>,
    #[serde(rename = "cognito:username")]
    username: Option<String>,
}

fn local_refresh_email_from_token(refresh_token: &str) -> Result<String, AuthGatewayError> {
    let token = jsonwebtoken::dangerous::insecure_decode::<LocalRefreshTokenClaims>(refresh_token)
        .map_err(|error| {
            AuthGatewayError::internal(
                AuthOperation::RefreshToken,
                format!("Invalid local refresh token: {error}"),
            )
        })?;

    token
        .claims
        .email
        .or(token.claims.username)
        .filter(|email| !email.trim().is_empty())
        .ok_or_else(|| {
            AuthGatewayError::internal(
                AuthOperation::RefreshToken,
                "Local refresh token is missing email".to_owned(),
            )
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use aws_sdk_cognitoidentityprovider::types::AuthenticationResultType;

    fn auth_result(
        access_token: Option<&str>,
        refresh_token: Option<&str>,
    ) -> AuthenticationResultType {
        let mut builder = AuthenticationResultType::builder();
        if let Some(access_token) = access_token {
            builder = builder.access_token(access_token);
        }
        if let Some(refresh_token) = refresh_token {
            builder = builder.refresh_token(refresh_token);
        }
        builder.build()
    }

    #[test]
    fn refresh_token_pair_uses_rotated_tokens() {
        let output = AuthTokenPair::from_auth_result(
            AuthOperation::RefreshToken,
            Some(&auth_result(Some("new-access"), Some("new-refresh"))),
        )
        .expect("rotated token output should be valid");

        assert_eq!(output.access_token, "new-access");
        assert_eq!(output.refresh_token, "new-refresh");
    }

    #[test]
    fn refresh_token_pair_rejects_missing_refresh_token() {
        let error = AuthTokenPair::from_auth_result(
            AuthOperation::RefreshToken,
            Some(&auth_result(Some("new-access"), None)),
        )
        .err()
        .expect("missing refresh token should be rejected");

        assert_eq!(error.operation(), AuthOperation::RefreshToken);
        assert_eq!(
            error.provider_message(),
            "Cognito Refresh token response is missing refresh token"
        );
    }

    #[test]
    fn one_time_password_provider_flow_round_trips_local_compatibility() {
        let flows = [
            (OneTimePasswordProviderFlow::Local, "local"),
            (OneTimePasswordProviderFlow::LocalSignIn, "local_sign_in"),
            (OneTimePasswordProviderFlow::LocalSignUp, "local_sign_up"),
        ];

        for (flow, value) in flows {
            assert_eq!(flow.as_str(), value);
            assert_eq!(OneTimePasswordProviderFlow::from_str(value), Some(flow));
        }
    }

    #[test]
    fn local_refresh_email_from_token_reads_email_claim() {
        let token =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im93bmVyQGV4YW1wbGUuY29tIn0.invalid";

        let email = local_refresh_email_from_token(token)
            .expect("local refresh token should expose the email");

        assert_eq!(email, "owner@example.com");
    }

    #[test]
    fn local_refresh_email_from_token_rejects_missing_email() {
        let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEifQ.invalid";

        let error = local_refresh_email_from_token(token)
            .err()
            .expect("missing email should be rejected");

        assert_eq!(error.operation(), AuthOperation::RefreshToken);
        assert_eq!(
            error.provider_message(),
            "Local refresh token is missing email"
        );
    }
}
