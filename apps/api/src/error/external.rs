use crate::error::{format_error_chain, AppError};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;
use uuid::Uuid;

pub fn dynamodb_batch_write_error<E: std::error::Error>(
    err: &E,
    table_name: &str,
    walk_id: Uuid,
    batch_size: usize,
) -> AppError {
    tracing::error!(
        error = ?err,
        table = table_name,
        walk_id = %walk_id,
        batch_size,
        "DynamoDB BatchWriteItem failed"
    );
    AppError::Internal(format!(
        "DynamoDB BatchWriteItem: {}",
        format_error_chain(err)
    ))
}

pub fn dynamodb_query_error<E: std::error::Error>(
    err: &E,
    table_name: &str,
    walk_id: Uuid,
) -> AppError {
    tracing::error!(
        error = ?err,
        table = table_name,
        walk_id = %walk_id,
        "DynamoDB Query failed"
    );
    AppError::Internal(format!("DynamoDB Query: {}", format_error_chain(err)))
}

pub fn map_cognito_error_code(code: Option<&str>) -> AppError {
    match code {
        Some("UsernameExistsException") => AppError::BadRequest("USER_EXISTS".to_string()),
        Some("NotAuthorizedException") => AppError::Unauthorized("INVALID_CREDENTIALS".to_string()),
        Some("CodeMismatchException") => AppError::BadRequest("INVALID_CODE".to_string()),
        Some("ExpiredCodeException") => AppError::BadRequest("EXPIRED_CODE".to_string()),
        Some("InvalidPasswordException") => AppError::BadRequest("INVALID_PASSWORD".to_string()),
        _ => AppError::Internal("AUTH_ERROR".to_string()),
    }
}

pub fn map_cognito_sdk_error<E, R>(
    err: &aws_smithy_runtime_api::client::result::SdkError<E, R>,
) -> AppError
where
    E: ProvideErrorMetadata,
{
    map_cognito_error_code(err.code())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cognito_error_code_maps_username_exists() {
        assert!(matches!(
            map_cognito_error_code(Some("UsernameExistsException")),
            AppError::BadRequest(msg) if msg == "USER_EXISTS"
        ));
    }

    #[test]
    fn cognito_error_code_maps_unknown_to_internal() {
        assert!(matches!(
            map_cognito_error_code(Some("SomethingElse")),
            AppError::Internal(msg) if msg == "AUTH_ERROR"
        ));
    }
}
