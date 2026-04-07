use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, QueryFilter, QueryOrder, Set,
};
use uuid::Uuid;

use crate::entities::friendships::{
    self, ActiveModel as FriendshipActiveModel, Entity as FriendshipEntity, Model as FriendshipModel,
};
use crate::error::AppError;

/// Insert or update a friendship between two dogs.
/// dog_id_1 MUST be < dog_id_2 (normalized by caller).
pub async fn upsert_friendship<C: sea_orm::ConnectionTrait>(
    db: &C,
    dog_id_1: Uuid,
    dog_id_2: Uuid,
    duration_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<FriendshipModel, AppError> {
    let existing = FriendshipEntity::find()
        .filter(friendships::Column::DogId1.eq(dog_id_1))
        .filter(friendships::Column::DogId2.eq(dog_id_2))
        .one(db)
        .await?;

    let friendship = if let Some(existing) = existing {
        let mut active: friendships::ActiveModel = existing.into();
        active.encounter_count = Set(active.encounter_count.unwrap() + 1);
        active.total_interaction_sec =
            Set(active.total_interaction_sec.unwrap() + duration_sec);
        active.last_met_at = Set(met_at.into());
        active.update(db).await?
    } else {
        FriendshipActiveModel {
            id: Set(Uuid::new_v4()),
            dog_id_1: Set(dog_id_1),
            dog_id_2: Set(dog_id_2),
            encounter_count: Set(1),
            total_interaction_sec: Set(duration_sec),
            first_met_at: Set(met_at.into()),
            last_met_at: Set(met_at.into()),
            created_at: Set(met_at.into()),
        }
        .insert(db)
        .await?
    };

    Ok(friendship)
}

/// Update the total_interaction_sec of an existing friendship by a precise delta.
pub async fn update_friendship_duration(
    db: &sea_orm::DatabaseConnection,
    dog_id_1: Uuid,
    dog_id_2: Uuid,
    delta_sec: i32,
) -> Result<bool, AppError> {
    if delta_sec == 0 {
        return Ok(true);
    }

    let existing = FriendshipEntity::find()
        .filter(friendships::Column::DogId1.eq(dog_id_1))
        .filter(friendships::Column::DogId2.eq(dog_id_2))
        .one(db)
        .await?;

    if let Some(existing) = existing {
        let new_total = (existing.total_interaction_sec + delta_sec).max(0);
        let mut active: friendships::ActiveModel = existing.into();
        active.total_interaction_sec = Set(new_total);
        active.update(db).await?;
    }

    Ok(true)
}

/// Get all friends of a dog, ordered by last_met_at DESC.
pub async fn get_friends_for_dog(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
) -> Result<Vec<FriendshipModel>, AppError> {
    let friends = FriendshipEntity::find()
        .filter(
            Condition::any()
                .add(friendships::Column::DogId1.eq(dog_id))
                .add(friendships::Column::DogId2.eq(dog_id)),
        )
        .order_by_desc(friendships::Column::LastMetAt)
        .all(db)
        .await?;

    Ok(friends)
}

/// Get a specific friendship between two dogs.
pub async fn get_friendship(
    db: &sea_orm::DatabaseConnection,
    dog_id_a: Uuid,
    dog_id_b: Uuid,
) -> Result<Option<FriendshipModel>, AppError> {
    let (dog_id_1, dog_id_2) = if dog_id_a < dog_id_b {
        (dog_id_a, dog_id_b)
    } else {
        (dog_id_b, dog_id_a)
    };

    let friendship = FriendshipEntity::find()
        .filter(friendships::Column::DogId1.eq(dog_id_1))
        .filter(friendships::Column::DogId2.eq(dog_id_2))
        .one(db)
        .await?;

    Ok(friendship)
}
