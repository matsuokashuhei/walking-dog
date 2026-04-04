use chrono::{Duration, Utc};
use rand::Rng;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, TransactionTrait};
use uuid::Uuid;

use crate::entities::dog_invitations::{
    self, ActiveModel, Entity as DogInvitationEntity, Model as DogInvitationModel,
};
use crate::entities::dog_members::Model as DogMemberModel;
use crate::error::AppError;
use crate::services::dog_member_service;

pub async fn create_invitation(
    db: &sea_orm::DatabaseConnection,
    dog_id: Uuid,
    invited_by: Uuid,
) -> Result<DogInvitationModel, AppError> {
    let token = generate_token();
    let expires_at = Utc::now() + Duration::hours(24);

    let model = ActiveModel {
        id: Set(Uuid::new_v4()),
        dog_id: Set(dog_id),
        token: Set(token),
        invited_by: Set(invited_by),
        expires_at: Set(expires_at.into()),
        ..Default::default()
    }
    .insert(db)
    .await?;

    Ok(model)
}

pub async fn accept_invitation(
    db: &sea_orm::DatabaseConnection,
    token: &str,
    user_id: Uuid,
) -> Result<DogMemberModel, AppError> {
    let txn = db.begin().await?;

    let invitation = DogInvitationEntity::find()
        .filter(dog_invitations::Column::Token.eq(token))
        .one(&txn)
        .await?
        .ok_or_else(|| AppError::NotFound("Invitation not found".to_string()))?;

    // Check if already used
    if invitation.used_by.is_some() {
        return Err(AppError::BadRequest(
            "Invitation has already been used".to_string(),
        ));
    }

    // Check if expired
    let now = Utc::now();
    let expires_at: chrono::DateTime<chrono::Utc> = invitation.expires_at.into();
    if now > expires_at {
        return Err(AppError::BadRequest("Invitation has expired".to_string()));
    }

    // Check if user is already a member
    if dog_member_service::require_dog_member(&txn, invitation.dog_id, user_id)
        .await
        .is_ok()
    {
        return Err(AppError::BadRequest(
            "User is already a member of this dog".to_string(),
        ));
    }

    // Mark invitation as used
    let mut active: dog_invitations::ActiveModel = invitation.clone().into();
    active.used_by = Set(Some(user_id));
    active.used_at = Set(Some(now.into()));
    active.update(&txn).await?;

    // Add user as member
    let member =
        dog_member_service::add_member(&txn, invitation.dog_id, user_id, "member").await?;

    txn.commit().await?;
    Ok(member)
}

fn generate_token() -> String {
    let bytes: [u8; 16] = rand::thread_rng().gen();
    hex::encode(bytes)
}
