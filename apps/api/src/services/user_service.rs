use crate::entities::users::{self, ActiveModel, Entity as UserEntity, Model as UserModel};
use crate::error::AppError;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, IntoActiveModel, QueryFilter, Set,
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

pub async fn get_user_by_id<C: ConnectionTrait>(
    db: &C,
    user_id: Uuid,
) -> Result<Option<UserModel>, AppError> {
    UserEntity::find_by_id(user_id)
        .one(db)
        .await
        .map_err(AppError::Database)
}

pub async fn get_users_by_ids<C: ConnectionTrait>(
    db: &C,
    user_ids: &[Uuid],
) -> Result<Vec<UserModel>, AppError> {
    if user_ids.is_empty() {
        return Ok(Vec::new());
    }

    UserEntity::find()
        .filter(users::Column::Id.is_in(user_ids.iter().copied()))
        .all(db)
        .await
        .map_err(AppError::Database)
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
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase};

    #[tokio::test]
    async fn get_users_by_ids_returns_empty_for_empty_input() {
        let db = MockDatabase::new(DatabaseBackend::Postgres).into_connection();
        assert!(get_users_by_ids(&db, &[]).await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn get_user_by_id_returns_none_when_missing() {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([Vec::<UserModel>::new()])
            .into_connection();
        assert!(get_user_by_id(&db, Uuid::new_v4()).await.unwrap().is_none());
    }
}
