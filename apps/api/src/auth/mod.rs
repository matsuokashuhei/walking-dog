pub mod jwt;
pub mod observability;
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

fn bearer_token(request: &Request) -> Option<String> {
    request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(str::to_string)
}

async fn authenticate_token(
    verifier: &Arc<dyn JwtVerifier>,
    token: Option<String>,
) -> Result<Option<AuthUser>, StatusCode> {
    let Some(token) = token else {
        return Ok(None);
    };

    let claims = verifier
        .verify(&token)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    Ok(Some(AuthUser {
        cognito_sub: claims.sub,
    }))
}

fn attach_auth_user(request: &mut Request, auth_user: AuthUser) {
    observability::on_authentication_success(&auth_user.cognito_sub);
    request.extensions_mut().insert(auth_user);
}

/// JWT検証ミドルウェア
/// Authorization ヘッダーがない場合は AuthUser を挿入せずに続行する（オプショナル認証）
pub async fn auth_middleware(
    State(verifier): State<Arc<dyn JwtVerifier>>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if let Some(auth_user) = authenticate_token(&verifier, bearer_token(&request)).await? {
        attach_auth_user(&mut request, auth_user);
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;

    #[test]
    fn bearer_token_returns_none_without_header() {
        let request = Request::new(Body::empty());
        assert!(bearer_token(&request).is_none());
    }

    #[test]
    fn bearer_token_extracts_bearer_value() {
        let mut request = Request::new(Body::empty());
        request
            .headers_mut()
            .insert("Authorization", "Bearer token-123".parse().unwrap());
        assert_eq!(bearer_token(&request).as_deref(), Some("token-123"));
    }
}
