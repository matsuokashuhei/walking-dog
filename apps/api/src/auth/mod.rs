pub mod jwt;
pub mod service;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use jwt::JwtVerifier;
use std::sync::Arc;

/// Axumのリクエスト拡張に認証済みユーザー情報を付与する
#[derive(Clone, Debug)]
pub struct AuthUser {
    pub cognito_sub: String,
}

/// JWT検証ミドルウェア
/// Authorization ヘッダーがない場合は AuthUser を挿入せずに続行する（オプショナル認証）
pub async fn auth_middleware(
    State(verifier): State<Arc<dyn JwtVerifier>>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(t) => t.to_string(),
        None => return Ok(next.run(request).await),
    };

    let cognito_sub = match verifier.verify(&token).await {
        Ok(claims) => claims.sub,
        Err(_) => return Err(StatusCode::UNAUTHORIZED),
    };

    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: Some(cognito_sub.clone()),
            ..Default::default()
        }));
    });

    request.extensions_mut().insert(AuthUser { cognito_sub });
    Ok(next.run(request).await)
}

/// GraphQL リゾルバ用: コンテキストから認証済みの cognito_sub を取得する。
/// 未認証の場合は Unauthorized エラーを返す。
pub fn require_auth(
    ctx: &async_graphql::dynamic::ResolverContext<'_>,
) -> async_graphql::Result<String> {
    ctx.data::<Option<String>>()?
        .clone()
        .ok_or_else(|| async_graphql::Error::new("Unauthorized"))
}
