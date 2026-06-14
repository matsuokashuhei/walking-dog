use anyhow::Result;
use async_graphql::{Context, InputObject, Object, SimpleObject};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

use crate::graphql::AuthAccessToken;
use crate::graphql::error::AppError;
use crate::graphql::{error::AuthError, guard::AuthGuard};
use crate::service::auth::{self, AuthTokenPair, SharedAuthGateway};

#[derive(Default, Debug)]
pub struct AuthMutation;

#[Object]
impl AuthMutation {
    async fn request_one_time_password(
        &self,
        ctx: &Context<'_>,
        input: RequestOneTimePasswordInput,
    ) -> Result<RequestOneTimePasswordOutput> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let output = auth::request_one_time_password(db, auth_gateway, input.email)
            .await
            .map_err(AuthError::from)?;
        Ok(RequestOneTimePasswordOutput {
            challenge_id: output.challenge_id,
        })
    }

    async fn verify_one_time_password(
        &self,
        ctx: &Context<'_>,
        input: VerifyOneTimePasswordInput,
    ) -> Result<VerifyOneTimePasswordOutput> {
        let db = ctx.data::<DatabaseConnection>().unwrap();
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let output =
            auth::verify_one_time_password(db, auth_gateway, input.challenge_id, input.code)
                .await
                .map_err(AuthError::from)?;
        Ok(output.into())
    }

    async fn refresh_token(
        &self,
        ctx: &Context<'_>,
        input: RefreshTokenInput,
    ) -> Result<RefreshTokenOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let output = auth_gateway
            .refresh_token(input.refresh_token)
            .await
            .map_err(AuthError::from)?;
        Ok(RefreshTokenOutput::from(output))
    }

    #[graphql(guard = "AuthGuard")]
    async fn sign_out(&self, ctx: &Context<'_>) -> Result<SignOutOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let authorization = ctx
            .data::<AuthAccessToken>()
            .map_err(|_| AppError::Unauthorized)?;
        auth_gateway
            .sign_out(authorization.token())
            .await
            .map_err(AuthError::from)?;
        Ok(SignOutOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn change_email(
        &self,
        ctx: &Context<'_>,
        input: ChangeEmailInput,
    ) -> Result<ChangeEmailOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let authorization = ctx
            .data::<AuthAccessToken>()
            .map_err(|_| AppError::Unauthorized)?;
        auth_gateway
            .change_email(authorization.token(), input.new_email)
            .await
            .map_err(AuthError::from)?;
        Ok(ChangeEmailOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn confirm_email_change(
        &self,
        ctx: &Context<'_>,
        input: ConfirmEmailChangeInput,
    ) -> Result<ConfirmEmailChangeOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let authorization = ctx
            .data::<AuthAccessToken>()
            .map_err(|_| AppError::Unauthorized)?;
        auth_gateway
            .confirm_email_change(authorization.token(), input.code)
            .await
            .map_err(AuthError::from)?;
        Ok(ConfirmEmailChangeOutput { success: true })
    }
}

#[derive(SimpleObject)]
pub struct RequestOneTimePasswordOutput {
    challenge_id: Uuid,
}

#[derive(Clone, Debug, InputObject)]
pub struct RequestOneTimePasswordInput {
    email: String,
}

#[derive(SimpleObject)]
pub struct VerifyOneTimePasswordOutput {
    access_token: String,
    refresh_token: String,
}

#[derive(Clone, Debug, InputObject)]
pub struct VerifyOneTimePasswordInput {
    challenge_id: Uuid,
    code: String,
}

impl From<AuthTokenPair> for VerifyOneTimePasswordOutput {
    fn from(output: AuthTokenPair) -> Self {
        VerifyOneTimePasswordOutput {
            access_token: output.access_token,
            refresh_token: output.refresh_token,
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

impl From<AuthTokenPair> for RefreshTokenOutput {
    fn from(output: AuthTokenPair) -> Self {
        RefreshTokenOutput {
            access_token: output.access_token,
            refresh_token: output.refresh_token,
        }
    }
}

#[derive(SimpleObject)]
pub struct SignOutOutput {
    success: bool,
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
