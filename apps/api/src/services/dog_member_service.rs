use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, JoinType, PaginatorTrait,
    QueryFilter, QuerySelect, RelationTrait, Set,
};
use std::collections::HashMap;
use uuid::Uuid;

use crate::entities::{
    dog_members::{self, ActiveModel, Entity as DogMemberEntity, Model as DogMemberModel},
    dogs::{self, Entity as DogEntity, Model as DogModel},
    users::{Entity as UserEntity, Model as UserModel},
};
use crate::error::AppError;

pub async fn require_dog_member<C: ConnectionTrait>(
    db: &C,
    dog_id: Uuid,
    user_id: Uuid,
) -> Result<DogMemberModel, AppError> {
    DogMemberEntity::find()
        .filter(dog_members::Column::DogId.eq(dog_id))
        .filter(dog_members::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Dog {} not found or access denied", dog_id)))
}

pub async fn require_dog_owner<C: ConnectionTrait>(
    db: &C,
    dog_id: Uuid,
    user_id: Uuid,
) -> Result<DogMemberModel, AppError> {
    DogMemberEntity::find()
        .filter(dog_members::Column::DogId.eq(dog_id))
        .filter(dog_members::Column::UserId.eq(user_id))
        .filter(dog_members::Column::Role.eq("owner"))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Dog {} not found or not owner", dog_id)))
}

pub async fn get_dogs_by_member<C: ConnectionTrait>(
    db: &C,
    user_id: Uuid,
) -> Result<Vec<DogModel>, AppError> {
    DogEntity::find()
        .join(JoinType::InnerJoin, dogs::Relation::DogMembers.def())
        .filter(dog_members::Column::UserId.eq(user_id))
        .all(db)
        .await
        .map_err(AppError::Database)
}

/// Return the user's dogs together with the membership role for each dog.
/// Result is `(dog, role)` pairs, where `role` is either `"owner"` or
/// `"member"`.
///
/// A dog without a matching `dog_members` row for this user is silently
/// skipped from the result. Under normal operation this cannot happen —
/// every dog_member row references an existing dog — but if the two
/// tables drift, the dog is omitted rather than being surfaced with a
/// missing role. The FK constraint on `dog_members.dog_id` makes this a
/// defensive guard rather than a practical concern.
pub async fn get_dogs_with_roles_for_user<C: ConnectionTrait>(
    db: &C,
    user_id: Uuid,
) -> Result<Vec<(DogModel, String)>, AppError> {
    let rows = DogMemberEntity::find()
        .filter(dog_members::Column::UserId.eq(user_id))
        .find_also_related(DogEntity)
        .all(db)
        .await?;

    Ok(rows
        .into_iter()
        .filter_map(|(membership, dog)| dog.map(|dog| (dog, membership.role)))
        .collect())
}

pub async fn get_members_by_dog<C: ConnectionTrait>(
    db: &C,
    dog_id: Uuid,
) -> Result<Vec<(DogMemberModel, UserModel)>, AppError> {
    let members = DogMemberEntity::find()
        .filter(dog_members::Column::DogId.eq(dog_id))
        .find_also_related(UserEntity)
        .all(db)
        .await?;

    Ok(members
        .into_iter()
        .filter_map(|(member, user)| user.map(|user| (member, user)))
        .collect())
}

pub async fn get_members_by_dog_ids<C: ConnectionTrait>(
    db: &C,
    dog_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<(DogMemberModel, UserModel)>>, AppError> {
    if dog_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = DogMemberEntity::find()
        .filter(dog_members::Column::DogId.is_in(dog_ids.iter().copied()))
        .find_also_related(UserEntity)
        .all(db)
        .await?;

    let mut grouped = HashMap::new();
    for (member, user) in rows {
        if let Some(user) = user {
            grouped
                .entry(member.dog_id)
                .or_insert_with(Vec::new)
                .push((member, user));
        }
    }

    Ok(grouped)
}

pub async fn require_any_dog_member<C: ConnectionTrait>(
    db: &C,
    dog_ids: &[Uuid],
    user_id: Uuid,
) -> Result<DogMemberModel, AppError> {
    DogMemberEntity::find()
        .filter(dog_members::Column::DogId.is_in(dog_ids.iter().copied()))
        .filter(dog_members::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Not a member of either dog".to_string()))
}

pub async fn remove_member(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
    user_id: Uuid,
) -> Result<bool, AppError> {
    // Check if the target user is an owner
    let target_member = DogMemberEntity::find()
        .filter(dog_members::Column::DogId.eq(dog_id))
        .filter(dog_members::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Member not found for dog {}", dog_id)))?;

    if target_member.role == "owner" {
        // Count how many owners this dog has
        let owner_count = DogMemberEntity::find()
            .filter(dog_members::Column::DogId.eq(dog_id))
            .filter(dog_members::Column::Role.eq("owner"))
            .count(db)
            .await?;

        if owner_count <= 1 {
            return Err(AppError::BadRequest(
                "Cannot remove the last owner. Transfer ownership first.".to_string(),
            ));
        }
    }

    let result = DogMemberEntity::delete_many()
        .filter(dog_members::Column::DogId.eq(dog_id))
        .filter(dog_members::Column::UserId.eq(user_id))
        .exec(db)
        .await?;
    Ok(result.rows_affected > 0)
}

pub async fn add_member<C: ConnectionTrait>(
    db: &C,
    dog_id: Uuid,
    user_id: Uuid,
    role: &str,
) -> Result<DogMemberModel, AppError> {
    let model = ActiveModel {
        id: Set(Uuid::new_v4()),
        dog_id: Set(dog_id),
        user_id: Set(user_id),
        role: Set(role.to_string()),
        ..Default::default()
    }
    .insert(db)
    .await?;
    Ok(model)
}
