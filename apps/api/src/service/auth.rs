use async_trait::async_trait;
use aws_sdk_cognitoidentityprovider::{
    Client,
    error::ProvideErrorMetadata,
    operation::{
        admin_delete_user::AdminDeleteUserError, admin_get_user::AdminGetUserError,
        confirm_sign_up::ConfirmSignUpError,
        get_tokens_from_refresh_token::GetTokensFromRefreshTokenError,
        global_sign_out::GlobalSignOutError, initiate_auth::InitiateAuthError,
        respond_to_auth_challenge::RespondToAuthChallengeError, sign_up::SignUpError,
        update_user_attributes::UpdateUserAttributesError,
        verify_user_attribute::VerifyUserAttributeError,
    },
    types::{AttributeType, AuthFlowType, ChallengeNameType, UserStatusType},
};
use std::{fmt, sync::Arc};

pub type SharedAuthGateway = Arc<dyn AuthGateway>;

#[async_trait]
pub trait AuthGateway: Send + Sync + 'static {
    async fn request_one_time_password(
        &self,
        email: String,
    ) -> Result<RequestOneTimePasswordResult, AuthGatewayError>;
    async fn verify_one_time_password(
        &self,
        email: String,
        session: String,
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
    user_pool_id: String,
    client_id: String,
}

impl CognitoAuthGateway {
    pub fn from_env(client: Client) -> anyhow::Result<Self> {
        Ok(Self {
            client,
            user_pool_id: std::env::var("AWS_COGNITO_USER_POOL_ID")?,
            client_id: std::env::var("AWS_COGNITO_CLIENT_ID")?,
        })
    }
}

#[derive(Debug, Clone)]
struct CognitoUserState {
    enabled: bool,
    status: UserStatusType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RequestOneTimePasswordAction {
    StartSignUp,
    DeleteAndStartSignUp,
    StartSignIn,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VerifyOneTimePasswordAction {
    ConfirmSignUpAndSignIn,
    RespondToEmailOtp,
}

fn normalize_email(email: String) -> String {
    email.trim().to_owned()
}

fn request_one_time_password_action(
    state: Option<&CognitoUserState>,
) -> Result<RequestOneTimePasswordAction, AuthGatewayError> {
    let Some(state) = state else {
        return Ok(RequestOneTimePasswordAction::StartSignUp);
    };

    ensure_user_can_authenticate(AuthOperation::RequestOneTimePassword, state)?;
    match &state.status {
        UserStatusType::Unconfirmed => Ok(RequestOneTimePasswordAction::DeleteAndStartSignUp),
        UserStatusType::Confirmed => Ok(RequestOneTimePasswordAction::StartSignIn),
        status => Err(AuthGatewayError::unsupported_cognito_user_status(
            AuthOperation::RequestOneTimePassword,
            status,
        )),
    }
}

fn verify_one_time_password_action(
    state: &CognitoUserState,
) -> Result<VerifyOneTimePasswordAction, AuthGatewayError> {
    ensure_user_can_authenticate(AuthOperation::VerifyOneTimePassword, state)?;
    match &state.status {
        UserStatusType::Unconfirmed => Ok(VerifyOneTimePasswordAction::ConfirmSignUpAndSignIn),
        UserStatusType::Confirmed => Ok(VerifyOneTimePasswordAction::RespondToEmailOtp),
        status => Err(AuthGatewayError::unsupported_cognito_user_status(
            AuthOperation::VerifyOneTimePassword,
            status,
        )),
    }
}

fn ensure_user_can_authenticate(
    operation: AuthOperation,
    state: &CognitoUserState,
) -> Result<(), AuthGatewayError> {
    if !state.enabled {
        return Err(AuthGatewayError::disabled_cognito_user(operation));
    }
    Ok(())
}

#[async_trait]
impl AuthGateway for CognitoAuthGateway {
    async fn request_one_time_password(
        &self,
        email: String,
    ) -> Result<RequestOneTimePasswordResult, AuthGatewayError> {
        let email = normalize_email(email);
        let state = self.cognito_user_state(&email).await?;

        match request_one_time_password_action(state.as_ref())? {
            RequestOneTimePasswordAction::StartSignUp => self.start_sign_up_challenge(email).await,
            RequestOneTimePasswordAction::DeleteAndStartSignUp => {
                self.delete_cognito_user(&email).await?;
                self.start_sign_up_challenge(email).await
            }
            RequestOneTimePasswordAction::StartSignIn => {
                let challenge = self.start_sign_in_challenge(email).await?;
                Ok(RequestOneTimePasswordResult {
                    created_user_sub: None,
                    challenge,
                })
            }
        }
    }

    async fn verify_one_time_password(
        &self,
        email: String,
        session: String,
        code: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        let email = normalize_email(email);
        let state = self.cognito_user_state(&email).await?.ok_or_else(|| {
            AuthGatewayError::missing_cognito_user(AuthOperation::VerifyOneTimePassword)
        })?;
        match verify_one_time_password_action(&state)? {
            VerifyOneTimePasswordAction::ConfirmSignUpAndSignIn => {
                self.confirm_sign_up_and_sign_in(email, session, code).await
            }
            VerifyOneTimePasswordAction::RespondToEmailOtp => {
                self.respond_to_email_otp(email, session, code).await
            }
        }
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
    async fn cognito_user_state(
        &self,
        email: &str,
    ) -> Result<Option<CognitoUserState>, AuthGatewayError> {
        let output = match self
            .client
            .admin_get_user()
            .user_pool_id(&self.user_pool_id)
            .username(email)
            .send()
            .await
        {
            Ok(output) => output,
            Err(error) => {
                let error = error.into_service_error();
                if matches!(error, AdminGetUserError::UserNotFoundException(_)) {
                    return Ok(None);
                }
                return Err(AuthGatewayError::from_admin_get_user_error(error));
            }
        };
        let status = output.user_status.clone().ok_or_else(|| {
            AuthGatewayError::missing_provider_token(
                AuthOperation::RequestOneTimePassword,
                "user status",
            )
        })?;
        Ok(Some(CognitoUserState {
            enabled: output.enabled,
            status,
        }))
    }

    async fn delete_cognito_user(&self, email: &str) -> Result<(), AuthGatewayError> {
        self.client
            .admin_delete_user()
            .user_pool_id(&self.user_pool_id)
            .username(email)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_admin_delete_user_error(error.into_service_error())
            })?;
        Ok(())
    }

    async fn start_sign_up_challenge(
        &self,
        email: String,
    ) -> Result<RequestOneTimePasswordResult, AuthGatewayError> {
        let output = self
            .client
            .sign_up()
            .client_id(&self.client_id)
            .username(email.clone())
            .user_attributes(
                AttributeType::builder()
                    .name("email")
                    .value(email.clone())
                    .build()
                    .expect("email user attribute is valid"),
            )
            .send()
            .await
            .map_err(|error| AuthGatewayError::from_sign_up_error(error.into_service_error()))?;
        let session = output
            .session
            .clone()
            .filter(|session| !session.is_empty())
            .ok_or_else(|| AuthGatewayError::missing_provider_session(AuthOperation::SignUp))?;

        Ok(RequestOneTimePasswordResult {
            created_user_sub: Some(output.user_sub),
            challenge: OneTimePasswordChallenge { email, session },
        })
    }

    async fn start_sign_in_challenge(
        &self,
        email: String,
    ) -> Result<OneTimePasswordChallenge, AuthGatewayError> {
        let output = self
            .client
            .initiate_auth()
            .client_id(&self.client_id)
            .auth_flow(AuthFlowType::UserAuth)
            .auth_parameters("USERNAME", email.clone())
            .auth_parameters("PREFERRED_CHALLENGE", "EMAIL_OTP")
            .send()
            .await
            .map_err(|error| AuthGatewayError::from_sign_in_error(error.into_service_error()))?;
        if !matches!(output.challenge_name, Some(ChallengeNameType::EmailOtp)) {
            return Err(AuthGatewayError::unexpected_provider_challenge(
                AuthOperation::SignIn,
                output.challenge_name.as_ref(),
            ));
        }
        let session = output
            .session
            .clone()
            .filter(|session| !session.is_empty())
            .ok_or_else(|| AuthGatewayError::missing_provider_session(AuthOperation::SignIn))?;
        Ok(OneTimePasswordChallenge { email, session })
    }

    async fn confirm_sign_up_and_sign_in(
        &self,
        email: String,
        session: String,
        code: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        let output = self
            .client
            .confirm_sign_up()
            .client_id(&self.client_id)
            .username(email.clone())
            .confirmation_code(code)
            .session(session)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_verify_one_time_password_confirm_error(
                    error.into_service_error(),
                )
            })?;
        let confirmed_session = output
            .session
            .clone()
            .filter(|session| !session.is_empty())
            .ok_or_else(|| {
                AuthGatewayError::missing_provider_session(AuthOperation::VerifyOneTimePassword)
            })?;
        let output = self
            .client
            .initiate_auth()
            .client_id(&self.client_id)
            .auth_flow(AuthFlowType::UserAuth)
            .auth_parameters("USERNAME", email)
            .auth_parameters("PREFERRED_CHALLENGE", "EMAIL_OTP")
            .session(confirmed_session)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_verify_one_time_password_sign_in_error(
                    error.into_service_error(),
                )
            })?;
        AuthTokenPair::from_auth_result(
            AuthOperation::VerifyOneTimePassword,
            output.authentication_result.as_ref(),
        )
    }

    async fn respond_to_email_otp(
        &self,
        email: String,
        session: String,
        code: String,
    ) -> Result<AuthTokenPair, AuthGatewayError> {
        let output = self
            .client
            .respond_to_auth_challenge()
            .client_id(&self.client_id)
            .challenge_name(ChallengeNameType::EmailOtp)
            .challenge_responses("USERNAME", email)
            .challenge_responses("EMAIL_OTP_CODE", code)
            .session(session)
            .send()
            .await
            .map_err(|error| {
                AuthGatewayError::from_verify_one_time_password_challenge_error(
                    error.into_service_error(),
                )
            })?;
        AuthTokenPair::from_auth_result(
            AuthOperation::VerifyOneTimePassword,
            output.authentication_result.as_ref(),
        )
    }
}

#[derive(Debug, Clone)]
pub struct RequestOneTimePasswordResult {
    pub created_user_sub: Option<String>,
    pub challenge: OneTimePasswordChallenge,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OneTimePasswordChallenge {
    pub email: String,
    pub session: String,
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
    RequestOneTimePassword,
    SignUp,
    SignIn,
    AdminGetUser,
    AdminDeleteUser,
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
            AuthOperation::SignUp => "Sign up",
            AuthOperation::SignIn => "Sign in",
            AuthOperation::AdminGetUser => "Admin get user",
            AuthOperation::AdminDeleteUser => "Admin delete user",
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

    fn missing_provider_session(operation: AuthOperation) -> Self {
        Self::missing_provider_token(operation, "session")
    }

    fn unexpected_provider_challenge(
        operation: AuthOperation,
        challenge_name: Option<&ChallengeNameType>,
    ) -> Self {
        Self {
            operation,
            message: format!(
                "Cognito {operation} response returned unexpected challenge {challenge_name:?}"
            ),
        }
    }

    fn missing_cognito_user(operation: AuthOperation) -> Self {
        Self {
            operation,
            message: "Cognito user does not exist".to_owned(),
        }
    }

    fn disabled_cognito_user(operation: AuthOperation) -> Self {
        Self {
            operation,
            message: "Cognito user is disabled".to_owned(),
        }
    }

    fn unsupported_cognito_user_status(operation: AuthOperation, status: &UserStatusType) -> Self {
        Self {
            operation,
            message: format!("Cognito user status {status:?} cannot use email one-time password"),
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

    fn from_sign_in_error(error: InitiateAuthError) -> Self {
        Self::from_provider_error(AuthOperation::SignIn, error)
    }

    fn from_admin_get_user_error(error: AdminGetUserError) -> Self {
        Self::from_provider_error(AuthOperation::AdminGetUser, error)
    }

    fn from_admin_delete_user_error(error: AdminDeleteUserError) -> Self {
        Self::from_provider_error(AuthOperation::AdminDeleteUser, error)
    }

    fn from_verify_one_time_password_confirm_error(error: ConfirmSignUpError) -> Self {
        Self::from_provider_error(AuthOperation::VerifyOneTimePassword, error)
    }

    fn from_verify_one_time_password_sign_in_error(error: InitiateAuthError) -> Self {
        Self::from_provider_error(AuthOperation::VerifyOneTimePassword, error)
    }

    fn from_verify_one_time_password_challenge_error(error: RespondToAuthChallengeError) -> Self {
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

    fn cognito_user_state(status: UserStatusType) -> CognitoUserState {
        CognitoUserState {
            enabled: true,
            status,
        }
    }

    #[test]
    fn request_one_time_password_action_starts_sign_up_when_user_is_missing() {
        let action = request_one_time_password_action(None).unwrap();

        assert_eq!(action, RequestOneTimePasswordAction::StartSignUp);
    }

    #[test]
    fn request_one_time_password_action_starts_sign_in_for_confirmed_user() {
        let state = cognito_user_state(UserStatusType::Confirmed);

        let action = request_one_time_password_action(Some(&state)).unwrap();

        assert_eq!(action, RequestOneTimePasswordAction::StartSignIn);
    }

    #[test]
    fn request_one_time_password_action_recreates_unconfirmed_user() {
        let state = cognito_user_state(UserStatusType::Unconfirmed);

        let action = request_one_time_password_action(Some(&state)).unwrap();

        assert_eq!(action, RequestOneTimePasswordAction::DeleteAndStartSignUp);
    }

    #[test]
    fn verify_one_time_password_action_confirms_unconfirmed_user() {
        let state = cognito_user_state(UserStatusType::Unconfirmed);

        let action = verify_one_time_password_action(&state).unwrap();

        assert_eq!(action, VerifyOneTimePasswordAction::ConfirmSignUpAndSignIn);
    }

    #[test]
    fn verify_one_time_password_action_responds_to_confirmed_user_challenge() {
        let state = cognito_user_state(UserStatusType::Confirmed);

        let action = verify_one_time_password_action(&state).unwrap();

        assert_eq!(action, VerifyOneTimePasswordAction::RespondToEmailOtp);
    }

    #[test]
    fn one_time_password_action_rejects_disabled_users() {
        let state = CognitoUserState {
            enabled: false,
            status: UserStatusType::Confirmed,
        };

        let error = request_one_time_password_action(Some(&state)).unwrap_err();

        assert_eq!(error.operation(), AuthOperation::RequestOneTimePassword);
        assert_eq!(error.provider_message(), "Cognito user is disabled");
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
