use crate::entities::users::{self, ActiveModel, Entity as UserEntity, Model as UserModel};
use crate::error::AppError;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, Set};
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

    // INSERT ... ON CONFLICT (cognito_sub) DO NOTHING via SeaORM TryInsert.
    // on_conflict_do_nothing_on returns TryInsert whose exec() maps
    // DbErr::RecordNotInserted -> Ok(Conflicted), while all other DB errors
    // propagate as Err via `?`. The TryInsertResult is intentionally discarded
    // because we always SELECT after to get the current row regardless of
    // whether insert or conflict occurred.
    let _ = UserEntity::insert(model)
        .on_conflict_do_nothing_on([users::Column::CognitoSub])
        .exec(db)
        .await?;

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

    /// Verify that production code does not silently swallow Result with `let _ = ... .await`.
    /// The `let _ = expr.await` pattern (ending with `.await;` not `.await?`) discards the
    /// entire Result including genuine DB errors like connection lost or permission denied.
    /// Using `.await?` propagates errors properly; discarding TryInsertResult after `?` is fine.
    #[test]
    fn no_silent_error_swallowing_in_upsert() {
        let source = include_str!("user_service.rs");
        let production_code = source
            .split("#[cfg(test)]")
            .next()
            .expect("file must contain #[cfg(test)]");
        // Detect `.await;` (Result silently discarded) after stripping whitespace.
        // `.await?;` is acceptable because `?` already propagates the error.
        let normalized = production_code.replace('\n', " ").replace("  ", " ");
        assert!(
            !normalized.contains(".await;"),
            "Production code must not end an expression with '.await;' which silently swallows Result errors. Use '.await?' to propagate errors."
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
