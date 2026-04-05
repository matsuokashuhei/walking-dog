use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, JoinType, PaginatorTrait,
    QueryFilter, QuerySelect, RelationTrait, Set,
};
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

pub async fn get_dogs_by_member(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
) -> Result<Vec<DogModel>, AppError> {
    DogEntity::find()
        .join(JoinType::InnerJoin, dogs::Relation::DogMembers.def())
        .filter(dog_members::Column::UserId.eq(user_id))
        .all(db)
        .await
        .map_err(AppError::Database)
}

pub async fn get_members_by_dog(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
) -> Result<Vec<(DogMemberModel, UserModel)>, AppError> {
    let members = DogMemberEntity::find()
        .filter(dog_members::Column::DogId.eq(dog_id))
        .all(db)
        .await?;

    let user_ids: Vec<Uuid> = members.iter().map(|m| m.user_id).collect();
    let users = UserEntity::find()
        .filter(crate::entities::users::Column::Id.is_in(user_ids))
        .all(db)
        .await?;

    let results = members
        .into_iter()
        .filter_map(|m| {
            let user = users.iter().find(|u| u.id == m.user_id)?.clone();
            Some((m, user))
        })
        .collect();

    Ok(results)
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
