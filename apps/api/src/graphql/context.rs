use std::sync::Arc;
use crate::AppState;

/// Convenience context accessor for GraphQL resolvers.
/// Resolvers can also use ctx.data::<Arc<AppState>>() and ctx.data::<String>() directly.
pub struct AppContext {
    pub state: Arc<AppState>,
    pub cognito_sub: String,
}
