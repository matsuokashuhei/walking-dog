use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, EntityTrait, QueryFilter,
    QueryOrder, Set,
};
use uuid::Uuid;

use crate::entities::friendships::{
    self, ActiveModel as FriendshipActiveModel, Entity as FriendshipEntity,
    Model as FriendshipModel,
};
use crate::error::AppError;
use crate::services::dog_pair::DogPair;

/// Insert or update a friendship between two dogs. The canonical
/// `dog_id_1 < dog_id_2` ordering is enforced by the `DogPair` type, so
/// callers can no longer pass an out-of-order tuple.
pub async fn upsert_friendship<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    duration_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<FriendshipModel, AppError> {
    let existing = FriendshipEntity::find()
        .filter(friendships::Column::DogId1.eq(pair.first()))
        .filter(friendships::Column::DogId2.eq(pair.second()))
        .one(db)
        .await?;

    let friendship = if let Some(existing) = existing {
        let new_encounter_count = existing.encounter_count + 1;
        let new_total_interaction_sec = existing.total_interaction_sec + duration_sec;
        let mut active: friendships::ActiveModel = existing.into();
        active.encounter_count = Set(new_encounter_count);
        active.total_interaction_sec = Set(new_total_interaction_sec);
        active.last_met_at = Set(met_at.into());
        active.update(db).await?
    } else {
        FriendshipActiveModel {
            id: Set(Uuid::new_v4()),
            dog_id_1: Set(pair.first()),
            dog_id_2: Set(pair.second()),
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
pub async fn update_friendship_duration<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    delta_sec: i32,
) -> Result<bool, AppError> {
    if delta_sec == 0 {
        return Ok(true);
    }

    let existing = FriendshipEntity::find()
        .filter(friendships::Column::DogId1.eq(pair.first()))
        .filter(friendships::Column::DogId2.eq(pair.second()))
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

/// Update an existing deduplicated encounter projection without incrementing encounter count.
pub async fn update_friendship_duration_and_last_met<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    delta_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<bool, AppError> {
    let existing = FriendshipEntity::find()
        .filter(friendships::Column::DogId1.eq(pair.first()))
        .filter(friendships::Column::DogId2.eq(pair.second()))
        .one(db)
        .await?;

    if let Some(existing) = existing {
        let new_total = (existing.total_interaction_sec + delta_sec).max(0);
        let mut active: friendships::ActiveModel = existing.into();
        active.total_interaction_sec = Set(new_total);
        active.last_met_at = Set(met_at.into());
        active.update(db).await?;
    }

    Ok(true)
}

/// Get all friends of a dog, ordered by last_met_at DESC.
pub async fn get_friends_for_dog<C: ConnectionTrait>(
    db: &C,
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

/// Get the friendship record for a specific pair of dogs.
pub async fn get_friendship<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
) -> Result<Option<FriendshipModel>, AppError> {
    let friendship = FriendshipEntity::find()
        .filter(friendships::Column::DogId1.eq(pair.first()))
        .filter(friendships::Column::DogId2.eq(pair.second()))
        .one(db)
        .await?;

    Ok(friendship)
}

#[cfg(test)]
mod tests {
    #[test]
    fn read_apis_are_available_for_database_connections_and_transactions() {
        let _friends_for_connection = super::get_friends_for_dog::<sea_orm::DatabaseConnection>;
        let _friends_for_transaction = super::get_friends_for_dog::<sea_orm::DatabaseTransaction>;
        let _friendship_for_connection = super::get_friendship::<sea_orm::DatabaseConnection>;
        let _friendship_for_transaction = super::get_friendship::<sea_orm::DatabaseTransaction>;
        let _update_duration_and_last_met_for_connection =
            super::update_friendship_duration_and_last_met::<sea_orm::DatabaseConnection>;
        let _update_duration_and_last_met_for_transaction =
            super::update_friendship_duration_and_last_met::<sea_orm::DatabaseTransaction>;
    }
}
