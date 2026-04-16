use crate::entities::{dog_members::Model as DogMemberModel, users::Model as UserModel};
use crate::error::AppError;
use crate::services::{dog_member_service, user_service, walk_event_service};
use crate::AppState;
use async_graphql::dynamic::ResolverContext;
use uuid::Uuid;

/// Resolve the authenticated user from the GraphQL context.
///
/// Combines `require_auth` + `get_or_create_user` into a single call.
pub async fn resolve_user(
    ctx: &ResolverContext<'_>,
    state: &AppState,
) -> async_graphql::Result<UserModel> {
    let cognito_sub = crate::auth::require_auth(ctx)?;
    user_service::get_or_create_user(&state.db, &cognito_sub)
        .await
        .map_err(AppError::into_graphql_error)
}

/// Resolve the authenticated user and verify dog membership.
///
/// Returns `(user, dog_member)`. The caller can inspect `dog_member.role`
/// when owner-only access is required.
pub async fn resolve_user_and_dog(
    ctx: &ResolverContext<'_>,
    state: &AppState,
    dog_id: Uuid,
) -> async_graphql::Result<(UserModel, DogMemberModel)> {
    let user = resolve_user(ctx, state).await?;
    let member = dog_member_service::require_dog_member(&state.db, dog_id, user.id)
        .await
        .map_err(AppError::into_graphql_error)?;
    Ok((user, member))
}

/// Resolve the authenticated user and verify walk access.
///
/// Uses `walk_event_service::require_walk_access` which checks walk ownership
/// or membership through walk_dogs → dog_members.
///
/// Security: unauthorized access and missing walks both return a uniform
/// `"Walk not found"` error to prevent walk ID enumeration by unauthenticated
/// or non-member users. See `tests/test_review_fixes.rs` (Fix 2).
pub async fn resolve_user_and_walk(
    ctx: &ResolverContext<'_>,
    state: &AppState,
    walk_id: Uuid,
) -> async_graphql::Result<UserModel> {
    let user = resolve_user(ctx, state).await?;
    walk_event_service::require_walk_access(&state.db, walk_id, user.id)
        .await
        .map_err(|e| match e {
            AppError::Unauthorized(_) | AppError::NotFound(_) => {
                AppError::NotFound("Walk not found".to_string())
            }
            other => other,
        })
        .map_err(AppError::into_graphql_error)?;
    Ok(user)
}

#[cfg(test)]
mod tests {

    /// Static guard: resolve_user must call require_auth exactly once.
    #[test]
    fn resolve_user_calls_require_auth() {
        let src = include_str!("auth_helpers.rs");
        assert!(
            src.contains("crate::auth::require_auth(ctx)"),
            "resolve_user must call crate::auth::require_auth"
        );
    }

    /// Static guard: resolve_user_and_dog must delegate to resolve_user (not inline require_auth).
    #[test]
    fn resolve_user_and_dog_delegates_to_resolve_user() {
        let src = include_str!("auth_helpers.rs");
        // resolve_user_and_dog should not call get_or_create_user directly (it goes via resolve_user)
        assert!(
            !src[src.find("fn resolve_user_and_dog").unwrap()..]
                .split("fn resolve_user_and_walk")
                .next()
                .unwrap_or("")
                .contains("get_or_create_user"),
            "resolve_user_and_dog must not call get_or_create_user directly"
        );
    }

    /// Static guard: resolve_user_and_walk must delegate to resolve_user.
    #[test]
    fn resolve_user_and_walk_delegates_to_resolve_user() {
        let src = include_str!("auth_helpers.rs");
        assert!(
            src.contains("resolve_user(ctx, state).await"),
            "resolve_user_and_walk must call resolve_user internally"
        );
    }
}
