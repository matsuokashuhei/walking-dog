use async_graphql::{Error, ErrorExtensions};
use aws_sdk_cognitoidentityprovider::operation::{
    change_password::ChangePasswordError, confirm_sign_up::ConfirmSignUpError,
    get_tokens_from_refresh_token::GetTokensFromRefreshTokenError,
    global_sign_out::GlobalSignOutError, initiate_auth::InitiateAuthError, sign_up::SignUpError,
    update_user_attributes::UpdateUserAttributesError,
    verify_user_attribute::VerifyUserAttributeError,
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

#[allow(clippy::enum_variant_names)]
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Sign up error: {0}")]
    SignUpError(SignUpError),
    #[error("Confirm sign up error: {0}")]
    ConfirmSignUpError(ConfirmSignUpError),
    #[error("Sign in error: {0}")]
    SignInError(InitiateAuthError),
    #[error("Refresh token error: {0}")]
    RefreshTokenError(GetTokensFromRefreshTokenError),
    #[error("Sign out error: {0}")]
    SignOutError(GlobalSignOutError),
    #[error("Update user attributes error: {0}")]
    UpdateUserAttributesError(UpdateUserAttributesError),
    #[error("Verify user attribute error: {0}")]
    VerifyUserAttributeError(VerifyUserAttributeError),
    #[error("Change password error: {0}")]
    ChangePasswordError(ChangePasswordError),
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
            AuthError::RefreshTokenError(refresh_token_error) => {
                error!("Refresh token error: {:?}", refresh_token_error);
                e.set("code", 401);
                e.set("message", refresh_token_error.message());
            }
            AuthError::SignOutError(sign_out_error) => {
                error!("Sign out error: {:?}", sign_out_error);
                e.set("code", 422);
                e.set("message", sign_out_error.message());
            }
            AuthError::UpdateUserAttributesError(update_user_attributes_error) => {
                error!(
                    "Update user attributes error: {:?}",
                    update_user_attributes_error
                );
                e.set("code", 422);
                e.set("message", update_user_attributes_error.message());
            }
            AuthError::VerifyUserAttributeError(verify_user_attribute_error) => {
                error!(
                    "Verify user attribute error: {:?}",
                    verify_user_attribute_error
                );
                e.set("code", 422);
                e.set("message", verify_user_attribute_error.message());
            }
            AuthError::ChangePasswordError(change_password_error) => {
                error!("Change password error: {:?}", change_password_error);
                e.set("code", 422);
                e.set("message", change_password_error.message());
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
            TrackPointError::BatchWriteItemError(batch_write_item_error) => {
                error!("Batch write item error: {:?}", batch_write_item_error);
                e.set("code", 500);
                e.set("message", batch_write_item_error.message());
            }
            TrackPointError::QueryError(query_error) => {
                error!("Query error: {:?}", query_error);
                e.set("code", 500);
                e.set("message", query_error.message());
            }
        })
    }
}
