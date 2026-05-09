use async_graphql::{EmptySubscription, Schema};
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::{IntoResponse, Response},
};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, jwk::JwkSet};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, DatabaseConnection};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

use crate::{
    entity::user,
    graphql::{mutation, query::Query},
};

pub async fn autenticate_user(
    State(schema): State<Schema<Query, mutation::Mutation, EmptySubscription>>,
    authorization: Option<TypedHeader<Authorization<Bearer>>>,
    mut request: Request,
    next: Next,
) -> Result<impl IntoResponse, Response> {
    let Some(TypedHeader(authorization)) = authorization else {
        info!("No Authorization header found");
        return Ok(next.run(request).await);
    };
    let Some(header) = jsonwebtoken::decode_header(authorization.token()).ok() else {
        warn!("Failed to decode token header");
        return Ok(next.run(request).await);
    };
    let Some(kid) = header.kid else {
        warn!("No kid found in token header");
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
        warn!("Failed to fetch JWKS");
        return Ok(next.run(request).await);
    };
    let Ok(jwks) = response.json::<JwkSet>().await else {
        warn!("Failed to parse JWKS");
        return Ok(next.run(request).await);
    };
    let Some(jwk) = jwks
        .keys
        .iter()
        .find(|jwk| jwk.common.key_id.as_ref() == Some(&kid))
    else {
        warn!("No matching JWK found for kid: {}", kid);
        return Ok(next.run(request).await);
    };
    let Some(decoding_key) = DecodingKey::from_jwk(jwk).ok() else {
        warn!("Failed to create decoding key from JWK");
        return Ok(next.run(request).await);
    };
    let Ok(token) = decode::<Claims>(
        authorization.token(),
        &decoding_key,
        &Validation::new(Algorithm::RS256),
    ) else {
        warn!("Failed to decode token claims");
        return Ok(next.run(request).await);
    };

    let db = schema.data::<DatabaseConnection>().unwrap();
    let cognito_sub = token.claims.sub.clone();
    let user = match user::Entity::find_by_cognito_sub(cognito_sub.clone())
        .one(db)
        .await
    {
        Ok(Some(user)) => Some(user),
        Ok(None) => {
            // Cognito 検証は通ったが DB に対応行が無い既存ユーザーはここで JIT 作成する。
            // 既存の signUp resolver と同じ shape (cognito_sub のみ) で追加し、
            // 名前は updateUser で後付けする運用に合わせる。
            warn!(cognito_sub = %cognito_sub, "User not found in DB; auto-provisioning");
            let active = user::ActiveModel {
                cognito_sub: Set(cognito_sub.clone()),
                ..Default::default()
            };
            match active.insert(db).await {
                Ok(user) => Some(user),
                Err(error) => {
                    warn!(?error, cognito_sub = %cognito_sub, "Failed to auto-provision user");
                    None
                }
            }
        }
        Err(error) => {
            warn!(?error, cognito_sub = %cognito_sub, "DB error during user lookup");
            None
        }
    };
    if let Some(user) = user {
        request.extensions_mut().insert(authorization);
        request.extensions_mut().insert(user);
    }
    Ok(next.run(request).await)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
}
