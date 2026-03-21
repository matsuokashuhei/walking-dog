// apps/api/src/error.rs
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

/// AppError を async_graphql::Error に変換する。
/// エラー種別に応じて GraphQL extension code を付与する。
impl From<AppError> for async_graphql::Error {
    fn from(e: AppError) -> Self {
        use async_graphql::ErrorExtensions;
        match e {
            AppError::BadRequest(msg) => {
                async_graphql::Error::new(msg).extend_with(|_, ext| {
                    ext.set("code", "BAD_USER_INPUT");
                })
            }
            AppError::NotFound(msg) => {
                async_graphql::Error::new(msg).extend_with(|_, ext| {
                    ext.set("code", "NOT_FOUND");
                })
            }
            AppError::Unauthorized(msg) => {
                async_graphql::Error::new(msg).extend_with(|_, ext| {
                    ext.set("code", "UNAUTHENTICATED");
                })
            }
            other => async_graphql::Error::new(other.to_string()).extend_with(|_, ext| {
                ext.set("code", "INTERNAL_SERVER_ERROR");
            }),
        }
    }
}
