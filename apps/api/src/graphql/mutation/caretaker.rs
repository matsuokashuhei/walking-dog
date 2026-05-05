use crate::{entity::caretakers, graphql::object::caretaker::Caretaker};
use anyhow::{Result, anyhow};
use async_graphql::{Context, Object, SimpleObject};
use aws_sdk_cognitoidentityprovider::operation::initiate_auth::InitiateAuthOutput;
use sea_orm::{ActiveModelTrait, ActiveValue::Set};

#[derive(Default, Debug)]
pub struct CaretakerMutation;

#[Object]
impl CaretakerMutation {
    async fn sign_up(&self, ctx: &Context<'_>, email: String, password: String) -> Result<bool> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let output = cognitoidentityprovider_client
            .sign_up()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .username(email.clone())
            .password(password)
            .send()
            .await
            .map_err(|e| anyhow!(e.into_service_error()))?;
        Ok(true)
    }

    async fn confirm_sign_up(
        &self,
        ctx: &Context<'_>,
        email: String,
        code: String,
    ) -> Result<bool> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        cognitoidentityprovider_client
            .confirm_sign_up()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .username(email)
            .confirmation_code(code)
            .send()
            .await
            .map_err(|e| anyhow!(e.into_service_error()))?;
        Ok(true)
    }

    async fn sign_in(&self, ctx: &Context<'_>, email: String, password: String) -> Result<SignIn> {
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let output = cognitoidentityprovider_client
            .initiate_auth()
            .client_id(std::env::var("AWS_COGNITO_CLIENT_ID").unwrap())
            .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::UserPasswordAuth)
            .auth_parameters("USERNAME", email)
            .auth_parameters("PASSWORD", password)
            .send()
            .await
            .map_err(|e| anyhow!(e.into_service_error()))?;
        Ok(output.into())
    }

    // async fn update_caretaker(&self, ctx: &Context<'_>) -> Result<Caretaker> {
    //     let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
    //     let caretaker = caretakers::ActiveModel {
    //         id: Set(uuid::Uuid::new_v4()),
    //     }
    //     .insert(db)
    //     .await?;
    //     Ok(caretaker.into())
    // }
}

#[derive(SimpleObject)]
pub struct SignIn {
    access_token: String,
    refresh_token: String,
}

impl From<InitiateAuthOutput> for SignIn {
    fn from(output: InitiateAuthOutput) -> Self {
        let result = output.authentication_result.unwrap();
        SignIn {
            access_token: result.access_token.unwrap_or_default(),
            refresh_token: result.refresh_token.unwrap_or_default(),
        }
    }
}
