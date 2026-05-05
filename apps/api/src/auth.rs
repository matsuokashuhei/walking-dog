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
    request: Request,
    next: Next,
) -> Result<impl IntoResponse, Response> {
    if let Some(TypedHeader(authorization)) = authorization {
        info!("Bearer token found: {}", authorization.token());
        let header = jsonwebtoken::decode_header(authorization.token()).unwrap();
        let kid = header.kid.unwrap();

        let jwks_url = if let Ok(endpoint) = std::env::var("AWS_COGNITO_ENDPOINT") {
            format!(
                "{region}/{user_pool_id}/.well-known/jwks.json",
                region = endpoint,
                user_pool_id = std::env::var("AWS_COGNITO_USER_POOL_ID").unwrap()
            )
        } else {
            format!(
                "https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json",
                region = std::env::var("AWS_REGION").unwrap(),
                user_pool_id = std::env::var("AWS_COGNITO_USER_POOL_ID").unwrap()
            )
        };
        // let jwks_url = format!(
        //     "https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json",
        //     region = std::env::var("AWS_REGION").unwrap(),
        //     user_pool_id = std::env::var("AWS_COGNITO_USER_POOL_ID").unwrap()
        // );
        info!("Fetching JWKS from: {}", jwks_url);
        let jwks: JwkSet = reqwest::get(&jwks_url).await.unwrap().json().await.unwrap();
        let jwk = jwks
            .keys
            .iter()
            .find(|jwk| jwk.common.key_id.as_ref() == Some(&kid))
            .unwrap();
        let decoding_key = DecodingKey::try_from(jwk).unwrap();
        // let jwks: JwkSet = reqwest::get(&jwks_url).await?.json().await?;
        let x = decode::<Claims>(
            authorization.token(),
            &decoding_key,
            &Validation::new(Algorithm::RS256),
        )
        .map_err(|e| {
            info!("Token decode error: {}", e);
            Response::builder()
                .status(401)
                .body("Unauthorized".into())
                .unwrap()
        })?;
        info!("Token decoded successfully: {:?}", x.claims);
    } else {
        info!("No Authorization header found");
    }

    Ok(next.run(request).await)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Claims {
    sub: String,
}
