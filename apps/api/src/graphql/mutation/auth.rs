use anyhow::Result;
use async_graphql::{Context, InputObject, Object, SimpleObject};
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

impl From<InitiateAuthOutput> for SignInOutput {
    fn from(output: InitiateAuthOutput) -> Self {
        let result = output.authentication_result.unwrap();
        SignInOutput {
            access_token: result.access_token.unwrap_or_default(),
            refresh_token: result.refresh_token.unwrap_or_default(),
        }
    }
}
