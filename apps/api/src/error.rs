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

impl AppError {
    /// Convert to async_graphql::Error with extension code.
    pub fn into_graphql_error(self) -> async_graphql::Error {
        use async_graphql::ErrorExtensions;
        match self {
            AppError::BadRequest(msg) => async_graphql::Error::new(msg).extend_with(|_, ext| {
                ext.set("code", "BAD_USER_INPUT");
            }),
            AppError::NotFound(msg) => async_graphql::Error::new(msg).extend_with(|_, ext| {
                ext.set("code", "NOT_FOUND");
            }),
            AppError::Unauthorized(msg) => async_graphql::Error::new(msg).extend_with(|_, ext| {
                ext.set("code", "UNAUTHENTICATED");
            }),
            other => async_graphql::Error::new(other.to_string()).extend_with(|_, ext| {
                ext.set("code", "INTERNAL_SERVER_ERROR");
            }),
        }
    }
}
