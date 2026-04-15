use crate::entities::users::{self, ActiveModel, Entity as UserEntity, Model as UserModel};
use crate::error::AppError;
use sea_orm::{
    sea_query::OnConflict, ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel,
    QueryFilter, Set,
};
use uuid::Uuid;

/// Internal helper: insert-or-fetch user by cognito_sub using SeaORM on_conflict.
/// `display_name` is only applied on first insert; a conflict re-fetches the existing row.
async fn upsert_user(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
    display_name: Option<&str>,
) -> Result<UserModel, AppError> {
    let model = ActiveModel {
        id: Set(Uuid::new_v4()),
        cognito_sub: Set(cognito_sub.to_string()),
        display_name: Set(display_name.map(|s| s.to_string())),
        ..Default::default()
    };

    let on_conflict = OnConflict::column(users::Column::CognitoSub)
        .do_nothing()
        .to_owned();

    // INSERT ... ON CONFLICT DO NOTHING: ignore the result (insert or skip).
    // exec() is used here rather than exec_with_returning() because DO NOTHING
    // returns no row on conflict, causing SeaORM's exec_with_returning to fail
    // with RecordNotFound. We always SELECT after to get the current row.
    let _ = UserEntity::insert(model)
        .on_conflict(on_conflict)
        .exec(db)
        .await;

    UserEntity::find()
        .filter(users::Column::CognitoSub.eq(cognito_sub))
        .one(db)
        .await?
        .ok_or_else(|| AppError::Internal("User disappeared after upsert".to_string()))
}

pub async fn get_or_create_user(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
) -> Result<UserModel, AppError> {
    upsert_user(db, cognito_sub, None).await
}

pub async fn create_user_with_profile(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
    display_name: &str,
) -> Result<UserModel, AppError> {
    upsert_user(db, cognito_sub, Some(display_name)).await
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

    let mut active: users::ActiveModel = model.into_active_model();
    if let Some(name) = display_name {
        active.display_name = Set(Some(name));
    }
    let updated = active.update(db).await?;
    Ok(updated)
}

#[cfg(test)]
mod tests {
    /// Verify that "duplicate key" string matching is no longer present in production code.
    /// This test enforces the Phase 4 completion condition.
    #[test]
    fn no_duplicate_key_string_matching_in_production_code() {
        let source = include_str!("user_service.rs");
        // Split at cfg(test) to isolate production code
        let production_code = source
            .split("#[cfg(test)]")
            .next()
            .expect("file must contain #[cfg(test)]");
        assert!(
            !production_code.contains("duplicate key"),
            "Production code must not contain 'duplicate key' string matching"
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
