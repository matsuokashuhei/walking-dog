use crate::error::AppError;
use crate::graphql::types::walk::Walk;
use uuid::Uuid;

pub async fn get_walks_by_dog_id(
    _db: &sea_orm::DatabaseConnection,
    _dog_id: Uuid,
    _limit: u64,
    _offset: u64,
) -> Result<Vec<Walk>, AppError> {
    Ok(vec![])
}
