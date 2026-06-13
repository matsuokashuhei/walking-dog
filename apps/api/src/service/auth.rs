use async_trait::async_trait;
use aws_sdk_cognitoidentityprovider::{
    Client,
    error::ProvideErrorMetadata,
    operation::{
        change_password::ChangePasswordError, confirm_forgot_password::ConfirmForgotPasswordError,
        confirm_sign_up::ConfirmSignUpError, forgot_password::ForgotPasswordError,
        get_tokens_from_refresh_token::GetTokensFromRefreshTokenError,
        global_sign_out::GlobalSignOutError, initiate_auth::InitiateAuthError,
        sign_up::SignUpError, update_user_attributes::UpdateUserAttributesError,
        verify_user_attribute::VerifyUserAttributeError,
    },
    types::{AttributeType, AuthFlowType},
};
use std::{fmt, sync::Arc};
use tracing::warn;

pub type SharedAuthGateway = Arc<dyn AuthGateway>;

#[async_trait]
pub trait AuthGateway: Send + Sync + 'static {
    async fn sign_up(
        &self,
        email: String,
        password: String,
    ) -> Result<SignUpResult, AuthGatewayError>;
    async fn confirm_sign_up(&self, email: String, code: String) -> Result<(), AuthGatewayError>;
    async fn sign_in(
        &self,
        email: String,
        password: String,
    ) -> Result<AuthTokenPair, AuthGatewayError>;
    async fn refresh_token(&self, refresh_token: String)
    -> Result<AuthTokenPair, AuthGatewayError>;
    async fn sign_out(&self, access_token: &str) -> Result<(), AuthGatewayError>;
    async fn forgot_password(&self, email: String) -> Result<(), AuthGatewayError>;
    async fn confirm_forgot_password(
        &self,
        email: String,
        code: String,
        new_password: String,
    ) -> Result<(), AuthGatewayError>;
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
    async fn change_password(
        &self,
        access_token: &str,
        old_password: String,
        new_password: String,
    ) -> Result<(), AuthGatewayError>;
}

pub struct CognitoAuthGateway {
    client: Client,
    client_id: String,
    skip_global_sign_out: bool,
}

impl CognitoAuthGateway {
    pub fn from_env(client: Client) -> anyhow::Result<Self> {
        let cognito_endpoint = std::env::var("AWS_COGNITO_ENDPOINT").ok();
        Ok(Self {
            client,
            client_id: std::env::var("AWS_COGNITO_CLIENT_ID")?,
            skip_global_sign_out: cognito_endpoint
                .as_deref()
                .is_some_and(is_local_cognito_endpoint),
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
    async fn sign_up(
        &self,
        email: String,
        password: String,
    ) -> Result<SignUpResult, AuthGatewayError> {
        let output = self
            .client
            .sign_up()
            .client_id(&self.client_id)
            .username(email)
            .password(password)
            .send()
            .await
            .map_err(|error| AuthGatewayError::from_sign_up_error(error.into_service_error()))?;

        Ok(SignUpResult {
            user_sub: output.user_sub,
        })
    }

    async fn confirm_sign_up(&self, email: String, code: String) -> Result<(), AuthGatewayError> {
        self.client
            .confirm_sign_up()
            .client_id(&self.client_id)
            .username(email)
            .confirmation_code(code)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_confirm_sign_up_error(error.into_service_error())
            })?;
        Ok(())
    }

    async fn sign_in(
        &self,
        email: String,
        password: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        let output = self
            .client
            .initiate_auth()
            .client_id(&self.client_id)
            .auth_flow(AuthFlowType::UserPasswordAuth)
            .auth_parameters("USERNAME", email)
            .auth_parameters("PASSWORD", password)
            .send()
            .await
            .map_err(|error| AuthGatewayError::from_sign_in_error(error.into_service_error()))?;
        AuthTokenPair::from_auth_result(
            AuthOperation::SignIn,
            output.authentication_result.as_ref(),
        )
    }

    async fn refresh_token(
        &self,
        refresh_token: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
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

    async fn forgot_password(&self, email: String) -> Result<(), AuthGatewayError> {
        self.client
            .forgot_password()
            .client_id(&self.client_id)
            .username(email)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_forgot_password_error(error.into_service_error())
            })?;
        Ok(())
    }

    async fn confirm_forgot_password(
        &self,
        email: String,
        code: String,
        new_password: String,
    ) -> Result<(), AuthGatewayError> {
        self.client
            .confirm_forgot_password()
            .client_id(&self.client_id)
            .username(email)
            .confirmation_code(code)
            .password(new_password)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_confirm_forgot_password_error(error.into_service_error())
            })?;
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

    async fn change_password(
        &self,
        access_token: &str,
        old_password: String,
        new_password: String,
    ) -> Result<(), AuthGatewayError> {
        self.client
            .change_password()
            .previous_password(old_password)
            .proposed_password(new_password)
            .access_token(access_token)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_change_password_error(error.into_service_error())
            })?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct SignUpResult {
    pub user_sub: String,
}

#[derive(Debug, Clone)]
pub struct AuthTokenPair {
    pub access_token: String,
    pub refresh_token: String,
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
    SignUp,
    ConfirmSignUp,
    SignIn,
    RefreshToken,
    SignOut,
    ForgotPassword,
    ConfirmForgotPassword,
    UpdateUserAttributes,
    VerifyUserAttribute,
    ChangePassword,
}

impl fmt::Display for AuthOperation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            AuthOperation::SignUp => "Sign up",
            AuthOperation::ConfirmSignUp => "Confirm sign up",
            AuthOperation::SignIn => "Sign in",
            AuthOperation::RefreshToken => "Refresh token",
            AuthOperation::SignOut => "Sign out",
            AuthOperation::ForgotPassword => "Forgot password",
            AuthOperation::ConfirmForgotPassword => "Confirm forgot password",
            AuthOperation::UpdateUserAttributes => "Update user attributes",
            AuthOperation::VerifyUserAttribute => "Verify user attribute",
            AuthOperation::ChangePassword => "Change password",
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
        Self::from_provider_error(AuthOperation::SignUp, error)
    }

    fn from_confirm_sign_up_error(error: ConfirmSignUpError) -> Self {
        Self::from_provider_error(AuthOperation::ConfirmSignUp, error)
    }

    fn from_sign_in_error(error: InitiateAuthError) -> Self {
        Self::from_provider_error(AuthOperation::SignIn, error)
    }

    fn from_refresh_token_error(error: GetTokensFromRefreshTokenError) -> Self {
        Self::from_provider_error(AuthOperation::RefreshToken, error)
    }

    fn from_sign_out_error(error: GlobalSignOutError) -> Self {
        Self::from_provider_error(AuthOperation::SignOut, error)
    }

    fn from_forgot_password_error(error: ForgotPasswordError) -> Self {
        Self::from_provider_error(AuthOperation::ForgotPassword, error)
    }

    fn from_confirm_forgot_password_error(error: ConfirmForgotPasswordError) -> Self {
        Self::from_provider_error(AuthOperation::ConfirmForgotPassword, error)
    }

    fn from_update_user_attributes_error(error: UpdateUserAttributesError) -> Self {
        Self::from_provider_error(AuthOperation::UpdateUserAttributes, error)
    }

    fn from_verify_user_attribute_error(error: VerifyUserAttributeError) -> Self {
        Self::from_provider_error(AuthOperation::VerifyUserAttribute, error)
    }

    fn from_change_password_error(error: ChangePasswordError) -> Self {
        Self::from_provider_error(AuthOperation::ChangePassword, error)
    }
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
}
