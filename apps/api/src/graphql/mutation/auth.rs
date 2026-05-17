use anyhow::Result;
use async_graphql::{
    Context, ErrorExtensions, InputObject, Object, Result as GraphqlResult, SimpleObject,
};
use aws_sdk_cognitoidentityprovider::operation::initiate_auth::InitiateAuthOutput;
use axum_extra::headers::authorization;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, DatabaseConnection};

use crate::entity::user;
use crate::graphql::{
    error::{AppError, AuthError},
    guard::AuthGuard,
};

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
    async fn sign_out(&self, ctx: &Context<'_>) -> GraphqlResult<SignOutOutput> {
        let authorization = bearer_from_context(ctx)?;
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        let _ = cognitoidentityprovider_client
            .global_sign_out()
            .access_token(authorization.token())
            .send()
            .await
            .map_err(|e| AuthError::SignOutError(e.into_service_error()).extend())?;
        Ok(SignOutOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn change_password(
        &self,
        ctx: &Context<'_>,
        input: ChangePasswordInput,
    ) -> GraphqlResult<SignOutOutput> {
        let authorization = bearer_from_context(ctx)?;
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        cognitoidentityprovider_client
            .change_password()
            .previous_password(input.old_password)
            .proposed_password(input.new_password)
            .access_token(authorization.token())
            .send()
            .await
            .map_err(|e| AuthError::ChangePasswordError(e.into_service_error()).extend())?;
        Ok(SignOutOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn update_email(
        &self,
        ctx: &Context<'_>,
        input: UpdateEmailInput,
    ) -> GraphqlResult<UpdateEmailOutput> {
        use aws_sdk_cognitoidentityprovider::types::AttributeType;

        let authorization = bearer_from_context(ctx)?;
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
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
            .map_err(|e| AuthError::UpdateUserAttributesError(e.into_service_error()).extend())?;
        Ok(UpdateEmailOutput { success: true })
    }

    #[graphql(guard = "AuthGuard")]
    async fn confirm_email_change(
        &self,
        ctx: &Context<'_>,
        input: ConfirmEmailChangeInput,
    ) -> GraphqlResult<ConfirmEmailChangeOutput> {
        let authorization = bearer_from_context(ctx)?;
        let cognitoidentityprovider_client = ctx
            .data::<aws_sdk_cognitoidentityprovider::Client>()
            .unwrap();
        cognitoidentityprovider_client
            .verify_user_attribute()
            .access_token(authorization.token())
            .attribute_name("email")
            .code(input.code)
            .send()
            .await
            .map_err(|e| AuthError::VerifyUserAttributeError(e.into_service_error()).extend())?;
        Ok(ConfirmEmailChangeOutput { success: true })
    }
}

fn bearer_from_context<'ctx>(ctx: &'ctx Context<'_>) -> GraphqlResult<&'ctx authorization::Bearer> {
    ctx.data::<authorization::Bearer>()
        .map_err(|_| AppError::Unauthorized.extend())
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
pub struct ChangePasswordInput {
    old_password: String,
    new_password: String,
}

#[derive(Clone, Debug, InputObject)]
pub struct UpdateEmailInput {
    new_email: String,
}

#[derive(SimpleObject)]
pub struct UpdateEmailOutput {
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

impl From<InitiateAuthOutput> for SignInOutput {
    fn from(output: InitiateAuthOutput) -> Self {
        let result = output.authentication_result.unwrap();
        SignInOutput {
            access_token: result.access_token.unwrap_or_default(),
            refresh_token: result.refresh_token.unwrap_or_default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use async_graphql::{EmptySubscription, Request, Schema};
    use axum::{
        Router,
        body::Bytes,
        extract::State,
        http::{HeaderMap, HeaderValue, StatusCode, header::CONTENT_TYPE},
        response::{IntoResponse, Response},
        routing::post,
    };
    use axum_extra::headers::{Authorization, authorization::Bearer};
    use sea_orm::{ActiveValue::Set, TryIntoModel};
    use serde_json::json;
    use tokio::{net::TcpListener, sync::oneshot};

    use super::*;
    use crate::graphql::{mutation, query::Query};

    const ACCESS_TOKEN: &str = "current-access-token";

    #[tokio::test]
    async fn unauthenticated_update_email_returns_unauthorized_error_without_panicking() {
        let response = test_schema_without_cognito()
            .execute(Request::new(
                r#"mutation { updateEmail(input: { newEmail: "new@example.com" }) { success } }"#,
            ))
            .await;

        assert_graphql_error_code(response, 401);
    }

    #[tokio::test]
    async fn unauthenticated_confirm_email_change_returns_unauthorized_error_without_panicking() {
        let response = test_schema_without_cognito()
            .execute(Request::new(
                r#"mutation { confirmEmailChange(input: { code: "123456" }) { success } }"#,
            ))
            .await;

        assert_graphql_error_code(response, 401);
    }

    #[tokio::test]
    async fn update_email_with_user_but_no_bearer_returns_unauthorized_error_without_panicking() {
        let response = test_schema_without_cognito()
            .execute(
                Request::new(
                    r#"mutation { updateEmail(input: { newEmail: "new@example.com" }) { success } }"#,
                )
                .data(test_user()),
            )
            .await;

        assert_graphql_error_code(response, 401);
    }

    #[tokio::test]
    async fn authenticated_update_email_sends_current_access_token_and_email_attribute_to_cognito()
    {
        let mock = CognitoMock::spawn(StatusCode::OK, json!({}), None).await;
        let schema = test_schema_with_cognito(mock.client());

        let response = schema
            .execute(authenticated_request(
                r#"mutation { updateEmail(input: { newEmail: "new@example.com" }) { success } }"#,
            ))
            .await;

        assert_success(response, "updateEmail");
        let request = mock.captured_request.await.unwrap();
        mock.shutdown.send(()).unwrap();
        assert_eq!(
            request.target,
            "AWSCognitoIdentityProviderService.UpdateUserAttributes"
        );
        assert_eq!(request.body["AccessToken"], ACCESS_TOKEN);
        assert_eq!(request.body["UserAttributes"][0]["Name"], "email");
        assert_eq!(
            request.body["UserAttributes"][0]["Value"],
            "new@example.com"
        );
    }

    #[tokio::test]
    async fn authenticated_confirm_email_change_sends_current_access_token_and_code_to_cognito() {
        let mock = CognitoMock::spawn(StatusCode::OK, json!({}), None).await;
        let schema = test_schema_with_cognito(mock.client());

        let response = schema
            .execute(authenticated_request(
                r#"mutation { confirmEmailChange(input: { code: "123456" }) { success } }"#,
            ))
            .await;

        assert_success(response, "confirmEmailChange");
        let request = mock.captured_request.await.unwrap();
        mock.shutdown.send(()).unwrap();
        assert_eq!(
            request.target,
            "AWSCognitoIdentityProviderService.VerifyUserAttribute"
        );
        assert_eq!(request.body["AccessToken"], ACCESS_TOKEN);
        assert_eq!(request.body["AttributeName"], "email");
        assert_eq!(request.body["Code"], "123456");
    }

    #[tokio::test]
    async fn cognito_update_email_failure_returns_graphql_error_instead_of_success() {
        let mock = CognitoMock::spawn(
            StatusCode::BAD_REQUEST,
            json!({
                "__type": "NotAuthorizedException",
                "message": "Access Token has expired"
            }),
            Some("NotAuthorizedException"),
        )
        .await;
        let schema = test_schema_with_cognito(mock.client());

        let response = schema
            .execute(authenticated_request(
                r#"mutation { updateEmail(input: { newEmail: "new@example.com" }) { success } }"#,
            ))
            .await;

        let request = mock.captured_request.await.unwrap();
        mock.shutdown.send(()).unwrap();
        assert_eq!(
            request.target,
            "AWSCognitoIdentityProviderService.UpdateUserAttributes"
        );
        let json = assert_graphql_error_code(response, 401);
        assert_ne!(json["data"]["updateEmail"]["success"], true);
    }

    fn test_schema_without_cognito() -> Schema<Query, mutation::Mutation, EmptySubscription> {
        Schema::build(
            Query::default(),
            mutation::Mutation::default(),
            EmptySubscription,
        )
        .finish()
    }

    fn test_schema_with_cognito(
        client: aws_sdk_cognitoidentityprovider::Client,
    ) -> Schema<Query, mutation::Mutation, EmptySubscription> {
        Schema::build(
            Query::default(),
            mutation::Mutation::default(),
            EmptySubscription,
        )
        .data(client)
        .finish()
    }

    fn authenticated_request(query: &str) -> Request {
        Request::new(query)
            .data(test_user())
            .data(Authorization::<Bearer>::bearer(ACCESS_TOKEN).unwrap().0)
    }

    fn test_user() -> user::Model {
        let now = chrono::Utc::now();
        user::ActiveModel {
            id: Set(uuid::Uuid::now_v7()),
            name: Set(None),
            avatar: Set(None),
            cognito_sub: Set("test-cognito-sub".to_owned()),
            created_at: Set(now.clone().into()),
            updated_at: Set(now.into()),
        }
        .try_into_model()
        .unwrap()
    }

    fn assert_success(response: async_graphql::Response, field_name: &str) {
        assert!(response.errors.is_empty(), "{:?}", response.errors);
        let json = serde_json::to_value(response).unwrap();
        assert_eq!(json["data"][field_name]["success"], true);
    }

    fn assert_graphql_error_code(
        response: async_graphql::Response,
        expected_code: i32,
    ) -> serde_json::Value {
        assert!(!response.errors.is_empty());
        let json = serde_json::to_value(response).unwrap();
        assert_eq!(json["errors"][0]["extensions"]["code"], expected_code);
        json
    }

    #[derive(Debug)]
    struct CapturedCognitoRequest {
        target: String,
        body: serde_json::Value,
    }

    struct CognitoMock {
        endpoint: String,
        captured_request: oneshot::Receiver<CapturedCognitoRequest>,
        shutdown: oneshot::Sender<()>,
    }

    impl CognitoMock {
        async fn spawn(
            status: StatusCode,
            response_body: serde_json::Value,
            error_type: Option<&'static str>,
        ) -> Self {
            let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
            let endpoint = format!("http://{}", listener.local_addr().unwrap());
            let (request_sender, captured_request) = oneshot::channel();
            let (shutdown, shutdown_receiver) = oneshot::channel();
            let state = MockState {
                request_sender: Arc::new(Mutex::new(Some(request_sender))),
                status,
                response_body: response_body.to_string(),
                error_type,
            };
            let app = Router::new()
                .route("/", post(capture_cognito_request))
                .with_state(state);

            tokio::spawn(async move {
                axum::serve(listener, app)
                    .with_graceful_shutdown(async {
                        let _ = shutdown_receiver.await;
                    })
                    .await
                    .unwrap();
            });

            Self {
                endpoint,
                captured_request,
                shutdown,
            }
        }

        fn client(&self) -> aws_sdk_cognitoidentityprovider::Client {
            use aws_sdk_cognitoidentityprovider::config::{
                BehaviorVersion, Credentials, Region, retry::RetryConfig,
            };

            let config = aws_sdk_cognitoidentityprovider::Config::builder()
                .behavior_version(BehaviorVersion::latest())
                .region(Region::new("us-east-1"))
                .credentials_provider(Credentials::new(
                    "test-access-key-id",
                    "test-secret-access-key",
                    None,
                    None,
                    "test",
                ))
                .retry_config(RetryConfig::standard().with_max_attempts(1))
                .endpoint_url(self.endpoint.clone())
                .build();
            aws_sdk_cognitoidentityprovider::Client::from_conf(config)
        }
    }

    #[derive(Clone)]
    struct MockState {
        request_sender: Arc<Mutex<Option<oneshot::Sender<CapturedCognitoRequest>>>>,
        status: StatusCode,
        response_body: String,
        error_type: Option<&'static str>,
    }

    async fn capture_cognito_request(
        State(state): State<MockState>,
        headers: HeaderMap,
        body: Bytes,
    ) -> Response {
        let target = headers
            .get("x-amz-target")
            .and_then(|value| value.to_str().ok())
            .unwrap()
            .to_owned();
        let body = serde_json::from_slice(&body).unwrap();
        state
            .request_sender
            .lock()
            .unwrap()
            .take()
            .unwrap()
            .send(CapturedCognitoRequest { target, body })
            .unwrap();

        let mut response = (state.status, state.response_body).into_response();
        response.headers_mut().insert(
            CONTENT_TYPE,
            HeaderValue::from_static("application/x-amz-json-1.1"),
        );
        if let Some(error_type) = state.error_type {
            response
                .headers_mut()
                .insert("x-amzn-errortype", HeaderValue::from_static(error_type));
        }
        response
    }
}
