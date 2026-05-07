use async_graphql::{Error, ErrorExtensions};

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
