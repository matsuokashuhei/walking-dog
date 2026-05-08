use async_graphql::{Error, ErrorExtensions};
use aws_sdk_cognitoidentityprovider::operation::{
    confirm_sign_up::ConfirmSignUpError, initiate_auth::InitiateAuthError, sign_up::SignUpError,
};
use aws_sdk_s3::error::ProvideErrorMetadata;
use tracing::error;

use crate::entity::track_point::TrackPointError;

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

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Sign up error: {0}")]
    SignUpError(SignUpError),
    #[error("Confirm sign up error: {0}")]
    ConfirmSignUpError(ConfirmSignUpError),
    #[error("Sign in error: {0}")]
    SignInError(InitiateAuthError),
}

impl ErrorExtensions for AuthError {
    fn extend(&self) -> Error {
        Error::new(self.to_string()).extend_with(|_, e| match self {
            AuthError::SignUpError(sign_up_error) => {
                error!("Sign up error: {:?}", sign_up_error);
                e.set("code", 422);
                e.set("message", sign_up_error.message());
            }
            AuthError::ConfirmSignUpError(confirm_sign_up_error) => {
                error!("Confirm sign up error: {:?}", confirm_sign_up_error);
                e.set("code", 422);
                e.set("message", confirm_sign_up_error.message());
            }
            AuthError::SignInError(sign_in_error) => {
                error!("Sign in error: {:?}", sign_in_error);
                e.set("code", 422);
                e.set("message", sign_in_error.message());
            }
        })
    }
}

impl ErrorExtensions for TrackPointError {
    fn extend(&self) -> Error {
        Error::new(self.to_string()).extend_with(|_, e| match self {
            TrackPointError::PutItemError(put_item_error) => {
                error!("Put item error: {:?}", put_item_error);
                e.set("code", 500);
                e.set("message", put_item_error.message());
            }
            TrackPointError::QueryError(query_error) => {
                error!("Query error: {:?}", query_error);
                e.set("code", 500);
                e.set("message", query_error.message());
            }
        })
    }
}
