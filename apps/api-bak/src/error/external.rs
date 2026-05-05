use crate::error::{format_error_chain, AppError};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DynamoDbWalkPointsOperation {
    BuildPutRequest,
    BatchWriteItem { batch_size: usize },
    Query,
}

impl DynamoDbWalkPointsOperation {
    fn label(self) -> &'static str {
        match self {
            Self::BuildPutRequest => "BuildPutRequest",
            Self::BatchWriteItem { .. } => "BatchWriteItem",
            Self::Query => "Query",
        }
    }
}

pub fn map_dynamodb_walk_points_error<E: std::error::Error>(
    err: &E,
    table_name: &str,
    walk_id: Uuid,
    operation: DynamoDbWalkPointsOperation,
) -> AppError {
    let operation_label = operation.label();
    match operation {
        DynamoDbWalkPointsOperation::BatchWriteItem { batch_size } => {
            tracing::error!(
                error = ?err,
                table = table_name,
                walk_id = %walk_id,
                batch_size,
                operation = operation_label,
                "DynamoDB walk points operation failed"
            );
        }
        _ => {
            tracing::error!(
                error = ?err,
                table = table_name,
                walk_id = %walk_id,
                operation = operation_label,
                "DynamoDB walk points operation failed"
            );
        }
    }

    let formatted = format_error_chain(err);
    let message = match operation {
        DynamoDbWalkPointsOperation::BuildPutRequest => {
            format!(
                "PutRequest build failed for walk {}: {}",
                walk_id, formatted
            )
        }
        _ => format!("DynamoDB {}: {}", operation_label, formatted),
    };

    AppError::Internal(message)
}

pub fn dynamodb_batch_write_error<E: std::error::Error>(
    err: &E,
    table_name: &str,
    walk_id: Uuid,
    batch_size: usize,
) -> AppError {
    map_dynamodb_walk_points_error(
        err,
        table_name,
        walk_id,
        DynamoDbWalkPointsOperation::BatchWriteItem { batch_size },
    )
}

pub fn dynamodb_query_error<E: std::error::Error>(
    err: &E,
    table_name: &str,
    walk_id: Uuid,
) -> AppError {
    map_dynamodb_walk_points_error(err, table_name, walk_id, DynamoDbWalkPointsOperation::Query)
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

    #[derive(Debug)]
    struct Inner;
    impl std::fmt::Display for Inner {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "ProvisionedThroughputExceededException: rate limit")
        }
    }
    impl std::error::Error for Inner {}

    #[derive(Debug)]
    struct Outer(Inner);
    impl std::fmt::Display for Outer {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "service error")
        }
    }
    impl std::error::Error for Outer {
        fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
            Some(&self.0)
        }
    }

    #[test]
    fn dynamodb_walk_points_error_maps_batch_write_with_full_error_chain() {
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        let mapped = map_dynamodb_walk_points_error(
            &Outer(Inner),
            "walk_points",
            walk_id,
            DynamoDbWalkPointsOperation::BatchWriteItem { batch_size: 25 },
        );

        assert!(matches!(
            mapped,
            AppError::Internal(message)
                if message == "DynamoDB BatchWriteItem: service error: ProvisionedThroughputExceededException: rate limit"
        ));
    }

    #[test]
    fn dynamodb_walk_points_error_maps_query_with_operation_boundary() {
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        let mapped = map_dynamodb_walk_points_error(
            &Outer(Inner),
            "walk_points",
            walk_id,
            DynamoDbWalkPointsOperation::Query,
        );

        assert!(matches!(
            mapped,
            AppError::Internal(message)
                if message == "DynamoDB Query: service error: ProvisionedThroughputExceededException: rate limit"
        ));
    }

    #[test]
    fn dynamodb_walk_points_error_preserves_put_request_build_message() {
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        let mapped = map_dynamodb_walk_points_error(
            &Outer(Inner),
            "walk_points",
            walk_id,
            DynamoDbWalkPointsOperation::BuildPutRequest,
        );

        assert!(matches!(
            mapped,
            AppError::Internal(message)
                if message == "PutRequest build failed for walk 11111111-2222-3333-4444-555555555555: service error: ProvisionedThroughputExceededException: rate limit"
        ));
    }

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
