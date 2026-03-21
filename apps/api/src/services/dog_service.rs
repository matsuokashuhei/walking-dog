use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, Set, TransactionTrait,
};
use uuid::Uuid;
use crate::entities::{
    dogs::{self, ActiveModel, Entity as DogEntity},
    walk_dogs::{self, Entity as WalkDogEntity},
    walks::Entity as WalkEntity,
};
use crate::error::AppError;
use crate::graphql::types::dog::Dog;

pub async fn create_dog(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    name: String,
    breed: Option<String>,
    gender: Option<String>,
    birth_date: Option<serde_json::Value>,
) -> Result<Dog, AppError> {
    let model = ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        name: Set(name),
        breed: Set(breed),
        gender: Set(gender),
        birth_date: Set(birth_date),
        ..Default::default()
    }
    .insert(db)
    .await?;
    Ok(model.into())
}

pub async fn update_dog(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
    user_id: Uuid,
    name: Option<String>,
    breed: Option<String>,
    gender: Option<String>,
    birth_date: Option<serde_json::Value>,
) -> Result<Dog, AppError> {
    let model = DogEntity::find_by_id(dog_id)
        .filter(dogs::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Dog {} not found", dog_id)))?;

    let mut active: ActiveModel = model.into();
    if let Some(n) = name { active.name = Set(n); }
    if let Some(b) = breed { active.breed = Set(Some(b)); }
    if let Some(g) = gender { active.gender = Set(Some(g)); }
    if let Some(bd) = birth_date { active.birth_date = Set(Some(bd)); }

    let updated = active.update(db).await?;
    Ok(updated.into())
}

/// Delete a dog.
/// ON DELETE CASCADE on walk_dogs removes related records automatically.
/// Walks with no remaining dogs are deleted inside the transaction.
pub async fn delete_dog(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
    user_id: Uuid,
) -> Result<bool, AppError> {
    let txn = db.begin().await?;

    let dog = DogEntity::find_by_id(dog_id)
        .filter(dogs::Column::UserId.eq(user_id))
        .one(&txn)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Dog {} not found", dog_id)))?;

    // Collect walk_ids this dog participates in before deleting
    let walk_dog_records = WalkDogEntity::find()
        .filter(walk_dogs::Column::DogId.eq(dog_id))
        .all(&txn)
        .await?;

    let walk_ids: Vec<Uuid> = walk_dog_records.iter().map(|wd| wd.walk_id).collect();

    // Delete the dog (ON DELETE CASCADE removes walk_dogs rows too)
    DogEntity::delete_by_id(dog.id).exec(&txn).await?;

    // Delete walks that now have no participating dogs
    for walk_id in walk_ids {
        let remaining = WalkDogEntity::find()
            .filter(walk_dogs::Column::WalkId.eq(walk_id))
            .count(&txn)
            .await?;
        if remaining == 0 {
            WalkEntity::delete_by_id(walk_id).exec(&txn).await?;
        }
    }

    txn.commit().await?;
    Ok(true)
}

pub async fn get_dog_by_id(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
) -> Result<Option<Dog>, AppError> {
    let model = DogEntity::find_by_id(dog_id).one(db).await?;
    Ok(model.map(Dog::from))
}

pub async fn get_dogs_by_user_id(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
) -> Result<Vec<Dog>, AppError> {
    let models = DogEntity::find()
        .filter(dogs::Column::UserId.eq(user_id))
        .all(db)
        .await?;
    Ok(models.into_iter().map(Dog::from).collect())
}

pub async fn get_dogs_by_walk_id(
    db: &sea_orm::DatabaseConnection,
    walk_id: Uuid,
) -> Result<Vec<Dog>, AppError> {
    use sea_orm::QuerySelect;

    let dog_ids: Vec<Uuid> = WalkDogEntity::find()
        .filter(walk_dogs::Column::WalkId.eq(walk_id))
        .select_only()
        .column(walk_dogs::Column::DogId)
        .into_tuple()
        .all(db)
        .await?;

    let models = DogEntity::find()
        .filter(dogs::Column::Id.is_in(dog_ids))
        .all(db)
        .await?;

    Ok(models.into_iter().map(Dog::from).collect())
}
