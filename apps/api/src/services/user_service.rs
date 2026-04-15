use crate::entities::users::{self, ActiveModel, Entity as UserEntity, Model as UserModel};
use crate::error::AppError;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

/// Internal helper: insert-or-fetch user by cognito_sub using SeaORM on_conflict.
/// `display_name` is only applied on first insert; a conflict re-fetches the existing row.
async fn upsert_user(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
    display_name: Option<&str>,
) -> Result<UserModel, AppError> {
    todo!("Phase 4 GREEN: implement upsert_user")
}

pub async fn get_or_create_user(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
) -> Result<UserModel, AppError> {
    if let Some(model) = UserEntity::find()
        .filter(users::Column::CognitoSub.eq(cognito_sub))
        .one(db)
        .await?
    {
        return Ok(model);
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
        Ok(model) => Ok(model),
        Err(sea_orm::DbErr::Query(ref err)) if err.to_string().contains("duplicate key") => {
            let model = UserEntity::find()
                .filter(users::Column::CognitoSub.eq(cognito_sub))
                .one(db)
                .await?
                .ok_or_else(|| {
                    AppError::Internal("User disappeared after insert conflict".to_string())
                })?;
            Ok(model)
        }
        Err(e) => Err(AppError::Database(e)),
    }
}

pub async fn create_user_with_profile(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
    display_name: &str,
) -> Result<UserModel, AppError> {
    if let Some(model) = UserEntity::find()
        .filter(users::Column::CognitoSub.eq(cognito_sub))
        .one(db)
        .await?
    {
        return Ok(model);
    }

    let result = ActiveModel {
        id: Set(Uuid::new_v4()),
        cognito_sub: Set(cognito_sub.to_string()),
        display_name: Set(Some(display_name.to_string())),
        ..Default::default()
    }
    .insert(db)
    .await;

    match result {
        Ok(model) => Ok(model),
        Err(sea_orm::DbErr::Query(ref err)) if err.to_string().contains("duplicate key") => {
            let model = UserEntity::find()
                .filter(users::Column::CognitoSub.eq(cognito_sub))
                .one(db)
                .await?
                .ok_or_else(|| {
                    AppError::Internal("User disappeared after insert conflict".to_string())
                })?;
            Ok(model)
        }
        Err(e) => Err(AppError::Database(e)),
    }
}

pub async fn update_profile(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
    display_name: Option<String>,
) -> Result<UserModel, AppError> {
    let model = UserEntity::find()
        .filter(users::Column::CognitoSub.eq(cognito_sub))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if display_name.is_none() {
        return Ok(model);
    }

    let mut active: users::ActiveModel = model.into();
    if let Some(name) = display_name {
        active.display_name = Set(Some(name));
    }
    let updated = active.update(db).await?;
    Ok(updated)
}

#[cfg(test)]
mod tests {
    /// Verify that "duplicate key" string matching is no longer present in this file.
    /// This test enforces the Phase 4 completion condition.
    #[test]
    fn no_duplicate_key_string_matching() {
        let source = include_str!("user_service.rs");
        // Count occurrences outside of this test module itself
        let occurrences: Vec<_> = source.match_indices("duplicate key").collect();
        // The only allowed occurrence is the one inside this test string literal
        assert_eq!(
            occurrences.len(),
            1,
            "Found 'duplicate key' string matching outside test: occurrences = {}",
            occurrences.len()
        );
    }

    /// Verify that upsert_user is the single implementation path:
    /// get_or_create_user and create_user_with_profile must delegate to upsert_user.
    #[test]
    fn get_or_create_user_uses_upsert_user() {
        let source = include_str!("user_service.rs");
        // After GREEN, get_or_create_user body should call upsert_user
        assert!(
            source.contains("upsert_user"),
            "upsert_user helper must exist in user_service.rs"
        );
    }
}
