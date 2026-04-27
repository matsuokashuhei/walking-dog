use crate::entities::walk_dogs::{self, Entity as WalkDogEntity};
use crate::error::AppError;
use crate::services::dog_pair::DogPair;
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect};
use uuid::Uuid;

pub async fn dog_ids_for_walk<C: ConnectionTrait>(
    db: &C,
    walk_id: Uuid,
) -> Result<Vec<Uuid>, AppError> {
    WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await
        .map_err(AppError::Database)
}

pub fn expand_pairs(my_dog_ids: &[Uuid], their_dog_ids: &[Uuid]) -> Result<Vec<DogPair>, AppError> {
    if my_dog_ids.is_empty() || their_dog_ids.is_empty() {
        return Err(AppError::BadRequest(
            "One or both walks have no dogs".to_string(),
        ));
    }

    Ok(my_dog_ids
        .iter()
        .flat_map(|my_dog| {
            their_dog_ids
                .iter()
                .filter_map(|their_dog| DogPair::new(*my_dog, *their_dog))
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expand_pairs_rejects_missing_dogs() {
        let error = expand_pairs(&[], &[Uuid::new_v4()]).unwrap_err();
        assert!(matches!(error, AppError::BadRequest(_)));
    }

    #[test]
    fn expand_pairs_skips_same_dog_pairs() {
        let dog_id = Uuid::new_v4();
        let pairs = expand_pairs(&[dog_id], &[dog_id]).unwrap();
        assert!(pairs.is_empty());
    }
}
