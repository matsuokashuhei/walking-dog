use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::Deserialize;

/// Axumのリクエスト拡張に認証済みユーザー情報を付与する
#[derive(Clone, Debug)]
pub struct AuthUser {
    pub cognito_sub: String,
}

#[derive(Debug, Deserialize)]
struct CognitoClaims {
    sub: String,
    exp: usize,
}

/// JWT検証ミドルウェア
/// TEST_MODE=true のとき、JWT検証をスキップして固定のcognito_subを返す
pub async fn auth_middleware(
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // TEST_MODE: JWT検証をスキップ
    if std::env::var("TEST_MODE").map(|v| v == "true" || v == "1").unwrap_or(false) {
        request.extensions_mut().insert(AuthUser {
            cognito_sub: "test-user-cognito-sub".to_string(),
        });
        return Ok(next.run(request).await);
    }

    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(t) => t.to_string(),
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let cognito_sub = match verify_cognito_jwt(&token).await {
        Ok(sub) => sub,
        Err(_) => return Err(StatusCode::UNAUTHORIZED),
    };

    request.extensions_mut().insert(AuthUser { cognito_sub });
    Ok(next.run(request).await)
}

async fn verify_cognito_jwt(token: &str) -> Result<String, String> {
    let header = decode_header(token).map_err(|e| e.to_string())?;
    let kid = header.kid.ok_or("missing kid")?;

    let user_pool_id = std::env::var("COGNITO_USER_POOL_ID").map_err(|e| e.to_string())?;
    let region = std::env::var("COGNITO_REGION").unwrap_or_else(|_| "ap-northeast-1".to_string());

    // COGNITO_ENDPOINT_URL が設定されている場合は cognito-local を使う
    let jwks_url = if let Ok(endpoint) = std::env::var("COGNITO_ENDPOINT_URL") {
        format!("{}/{}/.well-known/jwks.json", endpoint, user_pool_id)
    } else {
        format!(
            "https://cognito-idp.{}.amazonaws.com/{}/.well-known/jwks.json",
            region, user_pool_id
        )
    };

    let jwks: serde_json::Value = reqwest::get(&jwks_url)
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let key = jwks["keys"]
        .as_array()
        .and_then(|keys| keys.iter().find(|k| k["kid"] == kid))
        .ok_or("key not found")?;

    let n = key["n"].as_str().ok_or("missing n")?;
    let e = key["e"].as_str().ok_or("missing e")?;
    let decoding_key = DecodingKey::from_rsa_components(n, e).map_err(|e| e.to_string())?;

    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_issuer(&[format!(
        "https://cognito-idp.{}.amazonaws.com/{}",
        region, user_pool_id
    )]);

    let token_data = decode::<CognitoClaims>(token, &decoding_key, &validation)
        .map_err(|e| e.to_string())?;

    Ok(token_data.claims.sub)
}
