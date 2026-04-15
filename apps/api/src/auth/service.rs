use aws_sdk_cognitoidentityprovider::types::AttributeType;
use aws_sdk_cognitoidentityprovider::Client;
use aws_smithy_types::error::metadata::ProvideErrorMetadata;

use crate::error::AppError;

pub struct SignUpResult {
    pub user_confirmed: bool,
    pub user_sub: String,
}

pub struct SignInResult {
    pub access_token: String,
    pub refresh_token: String,
}

/// Pure function: maps a Cognito error code string to an AppError.
/// Extracted for unit testability without needing to construct SdkError.
pub(crate) fn map_error_code(code: Option<&str>) -> AppError {
    match code {
        Some("UsernameExistsException") => AppError::BadRequest("USER_EXISTS".to_string()),
        Some("NotAuthorizedException") => AppError::Unauthorized("INVALID_CREDENTIALS".to_string()),
        Some("CodeMismatchException") => AppError::BadRequest("INVALID_CODE".to_string()),
        Some("ExpiredCodeException") => AppError::BadRequest("EXPIRED_CODE".to_string()),
        Some("InvalidPasswordException") => AppError::BadRequest("INVALID_PASSWORD".to_string()),
        _ => AppError::Internal("AUTH_ERROR".to_string()),
    }
}

/// Maps a Cognito SdkError to an AppError using ProvideErrorMetadata::code().
fn map_cognito_error<E, R>(err: &aws_smithy_runtime_api::client::result::SdkError<E, R>) -> AppError
where
    E: ProvideErrorMetadata,
{
    map_error_code(err.code())
}

pub async fn sign_up(
    client: &Client,
    client_id: &str,
    email: &str,
    password: &str,
    display_name: &str,
) -> Result<SignUpResult, AppError> {
    let name_attr = AttributeType::builder()
        .name("name")
        .value(display_name)
        .build()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let result = client
        .sign_up()
        .client_id(client_id)
        .username(email)
        .password(password)
        .user_attributes(name_attr)
        .send()
        .await
        .map_err(|e| map_cognito_error(&e))?;

    Ok(SignUpResult {
        user_confirmed: result.user_confirmed,
        user_sub: result.user_sub().to_string(),
    })
}

pub async fn confirm_sign_up(
    client: &Client,
    client_id: &str,
    email: &str,
    code: &str,
) -> Result<(), AppError> {
    client
        .confirm_sign_up()
        .client_id(client_id)
        .username(email)
        .confirmation_code(code)
        .send()
        .await
        .map_err(|e| map_cognito_error(&e))?;

    Ok(())
}

pub async fn sign_in(
    client: &Client,
    client_id: &str,
    email: &str,
    password: &str,
) -> Result<SignInResult, AppError> {
    let result = client
        .initiate_auth()
        .client_id(client_id)
        .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::UserPasswordAuth)
        .auth_parameters("USERNAME", email)
        .auth_parameters("PASSWORD", password)
        .send()
        .await
        .map_err(|e| map_cognito_error(&e))?;

    let auth_result = result
        .authentication_result
        .ok_or_else(|| AppError::Internal("AUTH_ERROR".to_string()))?;

    let access_token = auth_result
        .access_token
        .ok_or_else(|| AppError::Internal("AUTH_ERROR".to_string()))?;

    let refresh_token = auth_result
        .refresh_token
        .ok_or_else(|| AppError::Internal("AUTH_ERROR".to_string()))?;

    Ok(SignInResult {
        access_token,
        refresh_token,
    })
}

pub async fn refresh_token(
    client: &Client,
    client_id: &str,
    refresh_token: &str,
) -> Result<SignInResult, AppError> {
    let result = client
        .initiate_auth()
        .client_id(client_id)
        .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::RefreshTokenAuth)
        .auth_parameters("REFRESH_TOKEN", refresh_token)
        .send()
        .await
        .map_err(|e| map_cognito_error(&e))?;

    let auth_result = result
        .authentication_result
        .ok_or_else(|| AppError::Internal("AUTH_ERROR".to_string()))?;

    let access_token = auth_result
        .access_token
        .ok_or_else(|| AppError::Internal("AUTH_ERROR".to_string()))?;

    // Cognito の RefreshTokenAuth は新しい refresh token を返さないことがある。
    // その場合は入力の refresh token をそのまま返す。
    let new_refresh_token = auth_result
        .refresh_token
        .unwrap_or_else(|| refresh_token.to_string());

    Ok(SignInResult {
        access_token,
        refresh_token: new_refresh_token,
    })
}

pub async fn sign_out(client: &Client, access_token: &str) -> Result<(), AppError> {
    let result = client
        .global_sign_out()
        .access_token(access_token)
        .send()
        .await;

    match result {
        Ok(_) => Ok(()),
        Err(ref e) => {
            let code = e.code();
            // cognito-local does not implement GlobalSignOut; treat as success in dev.
            if code
                .map(|c| c.contains("NotImplemented") || c.contains("Unsupported"))
                .unwrap_or(false)
            {
                return Ok(());
            }
            Err(map_cognito_error(&result.unwrap_err()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::map_error_code;
    use crate::error::AppError;

    #[test]
    fn map_error_code_username_exists() {
        let result = map_error_code(Some("UsernameExistsException"));
        assert!(matches!(result, AppError::BadRequest(msg) if msg == "USER_EXISTS"));
    }

    #[test]
    fn map_error_code_not_authorized() {
        let result = map_error_code(Some("NotAuthorizedException"));
        assert!(matches!(result, AppError::Unauthorized(msg) if msg == "INVALID_CREDENTIALS"));
    }

    #[test]
    fn map_error_code_code_mismatch() {
        let result = map_error_code(Some("CodeMismatchException"));
        assert!(matches!(result, AppError::BadRequest(msg) if msg == "INVALID_CODE"));
    }

    #[test]
    fn map_error_code_expired_code() {
        let result = map_error_code(Some("ExpiredCodeException"));
        assert!(matches!(result, AppError::BadRequest(msg) if msg == "EXPIRED_CODE"));
    }

    #[test]
    fn map_error_code_invalid_password() {
        let result = map_error_code(Some("InvalidPasswordException"));
        assert!(matches!(result, AppError::BadRequest(msg) if msg == "INVALID_PASSWORD"));
    }

    #[test]
    fn map_error_code_unknown() {
        let result = map_error_code(None);
        assert!(matches!(result, AppError::Internal(msg) if msg == "AUTH_ERROR"));
    }

    #[test]
    fn map_error_code_unrecognized() {
        let result = map_error_code(Some("SomeUnknownException"));
        assert!(matches!(result, AppError::Internal(msg) if msg == "AUTH_ERROR"));
    }
}
