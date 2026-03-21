use crate::error::AppError;
use crate::graphql::types::dog::Dog;
use uuid::Uuid;

pub async fn get_dogs_by_user_id(
    _db: &sea_orm::DatabaseConnection,
    _user_id: Uuid,
) -> Result<Vec<Dog>, AppError> {
    Ok(vec![])
}

pub async fn get_dogs_by_walk_id(
    _db: &sea_orm::DatabaseConnection,
    _walk_id: Uuid,
) -> Result<Vec<Dog>, AppError> {
    Ok(vec![])
}
