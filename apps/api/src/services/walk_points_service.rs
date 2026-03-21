use crate::error::AppError;
use crate::graphql::types::walk::WalkPoint;
use uuid::Uuid;

pub async fn get_walk_points(
    _dynamo: &aws_sdk_dynamodb::Client,
    _table: &str,
    _walk_id: Uuid,
) -> Result<Vec<WalkPoint>, AppError> {
    Ok(vec![])
}
