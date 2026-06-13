use anyhow::Result;
use async_graphql::{Context, InputObject, Object, SimpleObject};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, DatabaseConnection};

use crate::entity::user;
use crate::graphql::AuthAccessToken;
use crate::graphql::error::AppError;
use crate::graphql::{error::AuthError, guard::AuthGuard};
use crate::service::auth::{AuthTokenPair, SharedAuthGateway};

#[derive(Default, Debug)]
pub struct AuthMutation;

#[Object]
impl AuthMutation {
    async fn sign_up(&self, ctx: &Context<'_>, input: SignUpInput) -> Result<SignUpOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let output = auth_gateway
            .sign_up(input.email.clone(), input.password)
            .await
            .map_err(AuthError::from)?;
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
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        auth_gateway
            .confirm_sign_up(input.email, input.code)
            .await
            .map_err(AuthError::from)?;
        Ok(ConfirmSignUpOutput { success: true })
    }

    async fn forgot_password(
        &self,
        ctx: &Context<'_>,
        input: ForgotPasswordInput,
    ) -> Result<ForgotPasswordOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        auth_gateway
            .forgot_password(input.email)
            .await
            .map_err(AuthError::from)?;
        Ok(ForgotPasswordOutput { success: true })
    }

    async fn confirm_forgot_password(
        &self,
        ctx: &Context<'_>,
        input: ConfirmForgotPasswordInput,
    ) -> Result<ConfirmForgotPasswordOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        auth_gateway
            .confirm_forgot_password(input.email, input.code, input.new_password)
            .await
            .map_err(AuthError::from)?;
        Ok(ConfirmForgotPasswordOutput { success: true })
    }

    async fn sign_in(&self, ctx: &Context<'_>, input: SignInInput) -> Result<SignInOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let output = auth_gateway
            .sign_in(input.email, input.password)
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

    #[graphql(guard = "AuthGuard")]
    async fn change_password(
        &self,
        ctx: &Context<'_>,
        input: ChangePasswordInput,
    ) -> Result<ChangePasswordOutput> {
        let auth_gateway = ctx.data::<SharedAuthGateway>().unwrap();
        let authorization = ctx
            .data::<AuthAccessToken>()
            .map_err(|_| AppError::Unauthorized)?;
        auth_gateway
            .change_password(
                authorization.token(),
                input.old_password,
                input.new_password,
            )
            .await
            .map_err(AuthError::from)?;
        auth_gateway
            .sign_out(authorization.token())
            .await
            .map_err(AuthError::from)?;
        Ok(ChangePasswordOutput { success: true })
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
pub struct ForgotPasswordInput {
    email: String,
}

#[derive(SimpleObject)]
pub struct ForgotPasswordOutput {
    success: bool,
}

#[derive(Clone, Debug, InputObject)]
pub struct ConfirmForgotPasswordInput {
    email: String,
    code: String,
    new_password: String,
}

#[derive(SimpleObject)]
pub struct ConfirmForgotPasswordOutput {
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

impl From<AuthTokenPair> for SignInOutput {
    fn from(output: AuthTokenPair) -> Self {
        SignInOutput {
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

#[derive(SimpleObject)]
pub struct ChangePasswordOutput {
    success: bool,
}
