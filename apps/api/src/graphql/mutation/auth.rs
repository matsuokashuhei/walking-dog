use anyhow::Result;
use async_graphql::{Context, InputObject, Object, SimpleObject};
use aws_sdk_cognitoidentityprovider::operation::get_tokens_from_refresh_token::GetTokensFromRefreshTokenOutput;
use aws_sdk_cognitoidentityprovider::operation::initiate_auth::InitiateAuthOutput;
use aws_sdk_cognitoidentityprovider::types::AttributeType;
use axum_extra::headers::authorization;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, DatabaseConnection};

use crate::entity::user;
use crate::graphql::error::AppError;
use crate::graphql::{error::AuthError, guard::AuthGuard};

#[derive(Default, Debug)]
pub struct AuthMutation;

#[Object]
impl AuthMutation {
    async fn sign_up(&self, ctx: &Context<'_>, input: SignUpInput) -> Result<SignUpOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let output = cognitoidentityprovider_client
            .sign_up()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .username(input.email.clone())
            .password(input.password)
            .send()
            .await
            .map_err(|e| AuthError::SignUpError(e.into_service_error()))?;
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let user = user::ActiveModel {
            cognito_sub: Set(output.user_sub),
            ..Default::default()
        };
        user.insert(db).await?;
        Ok(SignUpOutput { success: true })
    }

    async fn confirm_sign_up(
        &self,
        ctx: &Context<'_>,
        input: ConfirmSignUpInput,
    ) -> Result<ConfirmSignUpOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        cognitoidentityprovider_client
            .confirm_sign_up()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .username(input.email)
            .confirmation_code(input.code)
            .send()
            .await
            .map_err(|e| AuthError::ConfirmSignUpError(e.into_service_error()))?;
        Ok(ConfirmSignUpOutput { success: true })
    }

    async fn sign_in(&self, ctx: &Context<'_>, input: SignInInput) -> Result<SignInOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let output = cognitoidentityprovider_client
            .initiate_auth()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::UserPasswordAuth)
            .auth_parameters("USERNAME", input.email)
            .auth_parameters("PASSWORD", input.password)
            .send()
            .await
            .map_err(|e| AuthError::SignInError(e.into_service_error()))?;
        Ok(output.into())
    }

    async fn refresh_token(
        &self,
        ctx: &Context<'_>,
        input: RefreshTokenInput,
    ) -> Result<RefreshTokenOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let output = cognitoidentityprovider_client
            .get_tokens_from_refresh_token()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .refresh_token(input.refresh_token)
            .send()
            .await
            .map_err(|e| AuthError::RefreshTokenError(e.into_service_error()))?;
        let output = RefreshTokenOutput::try_from(output)
            .map_err(|error| AppError::InternalServerError(error.to_string()))?;
        Ok(output)
    }

    #[graphql(guard = "AuthGuard")]
    async fn sign_out(&self, ctx: &Context<'_>) -> Result<SignOutOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let authorization = ctx.data::<authorization::Bearer>().unwrap();
        let _ = cognitoidentityprovider_client
            .global_sign_out()
            .access_token(authorization.token())
            .send()
            .await
            .map_err(|e| AuthError::SignOutError(e.into_service_error()))?;
        Ok(SignOutOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn change_email(
        &self,
        ctx: &Context<'_>,
        input: ChangeEmailInput,
    ) -> Result<ChangeEmailOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let authorization = ctx
            .data::<authorization::Bearer>()
            .map_err(|_| AppError::Unauthorized)?;
        cognitoidentityprovider_client
            .update_user_attributes()
            .access_token(authorization.token())
            .user_attributes(
                AttributeType::builder()
                    .name("email")
                    .value(input.new_email)
                    .build()
                    .unwrap(),
            )
            .send()
            .await
            .map_err(|e| AuthError::UpdateUserAttributesError(e.into_service_error()))?;
        Ok(ChangeEmailOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn confirm_email_change(
        &self,
        ctx: &Context<'_>,
        input: ConfirmEmailChangeInput,
    ) -> Result<ConfirmEmailChangeOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let authorization = ctx
            .data::<authorization::Bearer>()
            .map_err(|_| AppError::Unauthorized)?;
        cognitoidentityprovider_client
            .verify_user_attribute()
            .access_token(authorization.token())
            .attribute_name("email")
            .code(input.code)
            .send()
            .await
            .map_err(|e| AuthError::VerifyUserAttributeError(e.into_service_error()))?;
        Ok(ConfirmEmailChangeOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn change_password(
        &self,
        ctx: &Context<'_>,
        input: ChangePasswordInput,
    ) -> Result<SignOutOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let authorization = ctx
            .data::<authorization::Bearer>()
            .map_err(|_| AppError::Unauthorized)?;
        cognitoidentityprovider_client
            .change_password()
            .previous_password(input.old_password)
            .proposed_password(input.new_password)
            .access_token(authorization.token())
            .send()
            .await
            .map_err(|e| AuthError::ChangePasswordError(e.into_service_error()))?;
        Ok(SignOutOutput { success: true })
    }
}

#[derive(SimpleObject)]
pub struct SignOutOutput {
    success: bool,
}

#[derive(Clone, Debug, InputObject)]
pub struct SignUpInput {
    email: String,
    password: String,
}

#[derive(SimpleObject)]
pub struct SignUpOutput {
    success: bool,
}

#[derive(Clone, Debug, InputObject)]
pub struct ConfirmSignUpInput {
    email: String,
    code: String,
}

#[derive(SimpleObject)]
pub struct ConfirmSignUpOutput {
    success: bool,
}

#[derive(Clone, Debug, InputObject)]
pub struct SignInInput {
    email: String,
    password: String,
}

#[derive(SimpleObject)]
pub struct SignInOutput {
    access_token: String,
    refresh_token: String,
}

impl From<InitiateAuthOutput> for SignInOutput {
    fn from(output: InitiateAuthOutput) -> Self {
        SignInOutput {
            access_token: output
                .authentication_result
                .as_ref()
                .and_then(|result| result.access_token.clone())
                .unwrap_or_default(),
            refresh_token: output
                .authentication_result
                .as_ref()
                .and_then(|result| result.refresh_token.clone())
                .unwrap_or_default(),
        }
    }
}

#[derive(Clone, Debug, InputObject)]
pub struct RefreshTokenInput {
    refresh_token: String,
}

#[derive(SimpleObject)]
pub struct RefreshTokenOutput {
    access_token: String,
    refresh_token: String,
}

impl TryFrom<GetTokensFromRefreshTokenOutput> for RefreshTokenOutput {
    type Error = RefreshTokenOutputError;

    fn try_from(output: GetTokensFromRefreshTokenOutput) -> std::result::Result<Self, Self::Error> {
        let result = output
            .authentication_result
            .as_ref()
            .ok_or(RefreshTokenOutputError::MissingAuthenticationResult)?;
        let access_token = result
            .access_token
            .clone()
            .filter(|token| !token.is_empty())
            .ok_or(RefreshTokenOutputError::MissingAccessToken)?;
        let refresh_token = result
            .refresh_token
            .clone()
            .filter(|token| !token.is_empty())
            .ok_or(RefreshTokenOutputError::MissingRefreshToken)?;

        Ok(Self {
            access_token,
            refresh_token,
        })
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum RefreshTokenOutputError {
    #[error("Cognito refresh response is missing authentication result")]
    MissingAuthenticationResult,
    #[error("Cognito refresh response is missing access token")]
    MissingAccessToken,
    #[error("Cognito refresh response is missing refresh token")]
    MissingRefreshToken,
}

#[derive(Clone, Debug, InputObject)]
pub struct ChangeEmailInput {
    new_email: String,
}

#[derive(SimpleObject)]
pub struct ChangeEmailOutput {
    success: bool,
}

#[derive(Clone, Debug, InputObject)]
pub struct ConfirmEmailChangeInput {
    code: String,
}

#[derive(SimpleObject)]
pub struct ConfirmEmailChangeOutput {
    success: bool,
}

#[derive(Clone, Debug, InputObject)]
pub struct ChangePasswordInput {
    old_password: String,
    new_password: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use aws_sdk_cognitoidentityprovider::types::AuthenticationResultType;

    fn get_tokens_output(
        access_token: Option<&str>,
        refresh_token: Option<&str>,
    ) -> GetTokensFromRefreshTokenOutput {
        let mut authentication_result = AuthenticationResultType::builder();
        if let Some(access_token) = access_token {
            authentication_result = authentication_result.access_token(access_token);
        }
        if let Some(refresh_token) = refresh_token {
            authentication_result = authentication_result.refresh_token(refresh_token);
        }

        GetTokensFromRefreshTokenOutput::builder()
            .authentication_result(authentication_result.build())
            .build()
    }

    #[test]
    fn refresh_token_output_uses_rotated_tokens() {
        let output = RefreshTokenOutput::try_from(get_tokens_output(
            Some("new-access"),
            Some("new-refresh"),
        ))
        .expect("rotated token output should be valid");

        assert_eq!(output.access_token, "new-access");
        assert_eq!(output.refresh_token, "new-refresh");
    }

    #[test]
    fn refresh_token_output_rejects_missing_refresh_token() {
        let error = RefreshTokenOutput::try_from(get_tokens_output(Some("new-access"), None))
            .err()
            .expect("missing refresh token should be rejected");

        assert_eq!(error, RefreshTokenOutputError::MissingRefreshToken);
    }
}
