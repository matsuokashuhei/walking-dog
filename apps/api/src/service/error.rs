use sea_orm::{DbErr, TransactionError};

pub type ServiceResult<T> = Result<T, ServiceError>;

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Not found")]
    NotFound,
    #[error("Unprocessable entity: {0}")]
    UnprocessableEntity(String),
    #[error("Internal server error: {0}")]
    Internal(String),
}

impl From<DbErr> for ServiceError {
    fn from(error: DbErr) -> Self {
        Self::Internal(error.to_string())
    }
}

pub fn map_transaction_error(error: TransactionError<ServiceError>) -> ServiceError {
    match error {
        TransactionError::Connection(error) => ServiceError::from(error),
        TransactionError::Transaction(error) => error,
    }
}
