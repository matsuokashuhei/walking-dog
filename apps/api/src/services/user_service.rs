use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use uuid::Uuid;
use crate::entities::users::{self, ActiveModel, Entity as UserEntity};
use crate::error::AppError;
use crate::graphql::types::user::User;

pub async fn get_or_create_user(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
) -> Result<User, AppError> {
    if let Some(model) = UserEntity::find()
        .filter(users::Column::CognitoSub.eq(cognito_sub))
        .one(db)
        .await?
    {
        return Ok(model.into());
    }

    // Try to insert; if unique constraint violation, re-fetch
    let result = ActiveModel {
        id: Set(Uuid::new_v4()),
        cognito_sub: Set(cognito_sub.to_string()),
        ..Default::default()
    }
    .insert(db)
    .await;

    match result {
        Ok(model) => Ok(model.into()),
        Err(sea_orm::DbErr::Query(ref err))
            if err.to_string().contains("duplicate key") =>
        {
            let model = UserEntity::find()
                .filter(users::Column::CognitoSub.eq(cognito_sub))
                .one(db)
                .await?
                .ok_or_else(|| AppError::Internal("User disappeared after insert conflict".to_string()))?;
            Ok(model.into())
        }
        Err(e) => Err(AppError::Database(e)),
    }
}

pub async fn update_profile(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
    display_name: Option<String>,
) -> Result<User, AppError> {
    let model = UserEntity::find()
        .filter(users::Column::CognitoSub.eq(cognito_sub))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    let mut active: ActiveModel = model.into();
    if let Some(name) = display_name {
        active.display_name = Set(Some(name));
    }
    let updated = active.update(db).await?;
    Ok(updated.into())
}
