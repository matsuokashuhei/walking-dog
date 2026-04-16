use crate::error::AppError;
use async_trait::async_trait;

/// The set of claims extracted from a JWT.
#[derive(Debug, Clone)]
pub struct Claims {
    pub sub: String,
}

/// Abstracts JWT verification so tests can inject a no-op verifier.
#[async_trait]
pub trait JwtVerifier: Send + Sync {
    async fn verify(&self, token: &str) -> Result<Claims, AppError>;
}

/// Production verifier: validates Cognito JWTs via JWKS endpoint.
pub struct CognitoJwtVerifier;

#[async_trait]
impl JwtVerifier for CognitoJwtVerifier {
    async fn verify(&self, token: &str) -> Result<Claims, AppError> {
        let sub = verify_cognito_jwt(token)
            .await
            .map_err(|e| AppError::Unauthorized(e))?;
        Ok(Claims { sub })
    }
}

async fn verify_cognito_jwt(token: &str) -> Result<String, String> {
    use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};

    let header = decode_header(token).map_err(|e| e.to_string())?;
    let kid = header.kid.ok_or("missing kid")?;

    let user_pool_id = std::env::var("COGNITO_USER_POOL_ID").map_err(|e| e.to_string())?;
    let region = std::env::var("AWS_REGION").unwrap_or_else(|_| "ap-northeast-1".to_string());

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
    // Skip issuer validation for local development
    // (cognito-local uses 0.0.0.0 as issuer, which doesn't match the standard AWS format)
    if std::env::var("COGNITO_ENDPOINT_URL").is_err() {
        validation.set_issuer(&[format!(
            "https://cognito-idp.{}.amazonaws.com/{}",
            region, user_pool_id
        )]);
    }

    #[derive(serde::Deserialize)]
    struct CognitoClaims {
        sub: String,
    }

    let token_data = decode::<CognitoClaims>(token, &decoding_key, &validation)
        .map_err(|e| e.to_string())?;

    Ok(token_data.claims.sub)
}

/// Test-only verifier: treats the token value as the cognito_sub directly.
/// Replicates the TEST_MODE behavior:
/// - "test-token" maps to "test-user-cognito-sub"
/// - any other value is used as-is
#[cfg(test)]
pub struct NoOpJwtVerifier;

#[cfg(test)]
#[async_trait]
impl JwtVerifier for NoOpJwtVerifier {
    async fn verify(&self, token: &str) -> Result<Claims, AppError> {
        let sub = if token == "test-token" {
            "test-user-cognito-sub".to_string()
        } else {
            token.to_string()
        };
        Ok(Claims { sub })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn noop_verifier_maps_test_token_to_default_sub() {
        let verifier = NoOpJwtVerifier;
        let claims = verifier.verify("test-token").await.unwrap();
        assert_eq!(claims.sub, "test-user-cognito-sub");
    }

    #[tokio::test]
    async fn noop_verifier_uses_arbitrary_token_as_sub() {
        let verifier = NoOpJwtVerifier;
        let claims = verifier.verify("some-user-id").await.unwrap();
        assert_eq!(claims.sub, "some-user-id");
    }

    #[tokio::test]
    async fn noop_verifier_uses_user_b_token_as_sub() {
        let verifier = NoOpJwtVerifier;
        let claims = verifier
            .verify("test-user-b-cognito-sub")
            .await
            .unwrap();
        assert_eq!(claims.sub, "test-user-b-cognito-sub");
    }
}
