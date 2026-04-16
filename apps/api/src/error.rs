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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validation_errors_with_three_fields_produces_three_extensions_fields() {
        let errors = vec![
            FieldError { field: "myWalkId".to_string(), message: "Invalid UUID format".to_string() },
            FieldError { field: "theirWalkId".to_string(), message: "Invalid UUID format".to_string() },
            FieldError { field: "recordedAt".to_string(), message: "Invalid RFC3339 format".to_string() },
        ];
        let gql_err = AppError::ValidationErrors(errors).into_graphql_error();

        let ext = gql_err.extensions.expect("extensions must be set");
        let fields = ext.get("fields").expect("fields key must be in extensions");
        let fields_arr = fields.as_array().expect("fields must be a JSON array");
        assert_eq!(fields_arr.len(), 3, "expected 3 field errors, got: {:?}", fields_arr);

        // Verify first field has correct structure
        assert_eq!(fields_arr[0]["field"], "myWalkId");
        assert_eq!(fields_arr[0]["message"], "Invalid UUID format");
    }

    #[test]
    fn validation_errors_sets_bad_user_input_code() {
        let errors = vec![
            FieldError { field: "walkId".to_string(), message: "Invalid UUID".to_string() },
        ];
        let gql_err = AppError::ValidationErrors(errors).into_graphql_error();

        let ext = gql_err.extensions.expect("extensions must be set");
        let code = ext.get("code").expect("code must be in extensions");
        assert_eq!(code, "BAD_USER_INPUT");
    }
}
