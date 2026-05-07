use crate::{auth, entity::user};
use anyhow::{Result, anyhow};
use async_graphql::{Context, InputObject, Object, SimpleObject};
use aws_sdk_cognitoidentityprovider::operation::initiate_auth::InitiateAuthOutput;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, DatabaseConnection};
use tracing::info;

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
            .map_err(|e| anyhow!(e.into_service_error()))?;
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
            .map_err(|e| anyhow!(e.into_service_error()))?;
        Ok(ConfirmSignUpOutput { success: true })
    }

    async fn sign_in(&self, ctx: &Context<'_>, input: SignInInput) -> Result<SignInOutput> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        if let Ok(claims) = ctx.data::<axum::Extension<auth::Claims>>() {
            info!("Claims in sign_in: {:?}", claims.sub);
        }
        let output = cognitoidentityprovider_client
            .initiate_auth()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::UserPasswordAuth)
            .auth_parameters("USERNAME", input.email)
            .auth_parameters("PASSWORD", input.password)
            .send()
            .await
            .map_err(|e| anyhow!(e.into_service_error()))?;
        Ok(output.into())
    }
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
        let result = output.authentication_result.unwrap();
        SignInOutput {
            access_token: result.access_token.unwrap_or_default(),
            refresh_token: result.refresh_token.unwrap_or_default(),
        }
    }
}
