use axum::{
    extract::Request,
    middleware::Next,
    response::{IntoResponse, Response},
};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, jwk::JwkSet};
use serde::{Deserialize, Serialize};
use tracing::info;

pub async fn autenticate_token(
    authorization: Option<TypedHeader<Authorization<Bearer>>>,
    mut request: Request,
    next: Next,
) -> Result<impl IntoResponse, Response> {
    let Some(TypedHeader(authorization)) = authorization else {
        info!("No Authorization header found");
        return Ok(next.run(request).await);
    };
    let Some(header) = jsonwebtoken::decode_header(authorization.token()).ok() else {
        info!("Failed to decode token header");
        return Ok(next.run(request).await);
    };
    let Some(kid) = header.kid else {
        info!("No kid found in token header");
        return Ok(next.run(request).await);
    };
    let jwks_url = if let Ok(endpoint) = std::env::var("AWS_COGNITO_ENDPOINT") {
        format!(
            "{endpoint}/{user_pool_id}/.well-known/jwks.json",
            endpoint = endpoint,
            user_pool_id = std::env::var("AWS_COGNITO_USER_POOL_ID").unwrap()
        )
    } else {
        format!(
            "https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json",
            region = std::env::var("AWS_REGION").unwrap(),
            user_pool_id = std::env::var("AWS_COGNITO_USER_POOL_ID").unwrap()
        )
    };
    let Ok(response) = reqwest::get(&jwks_url).await else {
        info!("Failed to fetch JWKS");
        return Ok(next.run(request).await);
    };
    let Ok(jwks) = response.json::<JwkSet>().await else {
        info!("Failed to parse JWKS");
        return Ok(next.run(request).await);
    };
    let Some(jwk) = jwks
        .keys
        .iter()
        .find(|jwk| jwk.common.key_id.as_ref() == Some(&kid))
    else {
        info!("No matching JWK found for kid: {}", kid);
        return Ok(next.run(request).await);
    };
    let Some(decoding_key) = DecodingKey::from_jwk(jwk).ok() else {
        info!("Failed to create decoding key from JWK");
        return Ok(next.run(request).await);
    };
    let Ok(token) = decode::<Claims>(
        authorization.token(),
        &decoding_key,
        &Validation::new(Algorithm::RS256),
    ) else {
        info!("Failed to decode token claims");
        return Ok(next.run(request).await);
    };
    request.extensions_mut().insert(token.claims);
    Ok(next.run(request).await)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
}
