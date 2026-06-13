use async_graphql::{Error, ErrorExtensions};
use tracing::error;

use crate::service::auth::{AuthGatewayError, AuthOperation};
use crate::service::error::ServiceError;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not found")]
    NotFound,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Content too large")]
    ContentTooLarge,
    #[error("Unprocessable entity: {0}")]
    UnprocessableEntity(String),
    #[error("Internal server error: {0}")]
    InternalServerError(String),
}

impl From<ServiceError> for AppError {
    fn from(error: ServiceError) -> Self {
        match error {
            ServiceError::NotFound => AppError::NotFound,
            ServiceError::UnprocessableEntity(message) => AppError::UnprocessableEntity(message),
            ServiceError::Internal(message) => AppError::InternalServerError(message),
        }
    }
}

impl ErrorExtensions for AppError {
    fn extend(&self) -> Error {
        Error::new(self.to_string()).extend_with(|_, e| match self {
            AppError::Unauthorized => {
                e.set("code", 401);
            }
            AppError::NotFound => {
                e.set("code", 404);
            }
            AppError::ContentTooLarge => {
                e.set("code", 413);
            }
            AppError::UnprocessableEntity(message) => {
                e.set("code", 422);
                e.set("message", message);
            }
            AppError::InternalServerError(reason) => {
                e.set("code", 500);
                e.set("reason", reason);
            }
        })
    }
}

#[allow(clippy::enum_variant_names)]
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("{0}")]
    Provider(AuthGatewayError),
}

impl From<AuthGatewayError> for AuthError {
    fn from(error: AuthGatewayError) -> Self {
        Self::Provider(error)
    }
}

impl ErrorExtensions for AuthError {
    fn extend(&self) -> Error {
        Error::new(self.to_string()).extend_with(|_, e| match self {
            AuthError::Provider(error_value) => {
                error!("Auth provider error: {:?}", error_value);
                let code = match error_value.operation() {
                    AuthOperation::RefreshToken => 401,
                    _ => 422,
                };
                e.set("code", code);
                e.set("message", error_value.provider_message());
            }
        })
    }
}
