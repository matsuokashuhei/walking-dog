use aws_sdk_cognitoidentityprovider::Client;
use aws_sdk_cognitoidentityprovider::types::AttributeType;

pub struct SignUpResult {
    pub user_confirmed: bool,
    pub user_sub: String,
}

pub struct SignInResult {
    pub access_token: String,
    pub refresh_token: String,
}

fn map_cognito_error(err: &str) -> String {
    if err.contains("UsernameExistsException") {
        "USER_EXISTS".to_string()
    } else if err.contains("NotAuthorizedException") {
        "INVALID_CREDENTIALS".to_string()
    } else if err.contains("CodeMismatchException") {
        "INVALID_CODE".to_string()
    } else if err.contains("ExpiredCodeException") {
        "EXPIRED_CODE".to_string()
    } else if err.contains("InvalidPasswordException") {
        "INVALID_PASSWORD".to_string()
    } else if err.contains("Unsupported") {
        // cognito-local does not implement all operations; treat as success in dev.
        "UNSUPPORTED".to_string()
    } else {
        "AUTH_ERROR".to_string()
    }
}

pub async fn sign_up(
    client: &Client,
    client_id: &str,
    email: &str,
    password: &str,
    display_name: &str,
) -> Result<SignUpResult, String> {
    let name_attr = AttributeType::builder()
        .name("name")
        .value(display_name)
        .build()
        .map_err(|e| e.to_string())?;

    let result = client
        .sign_up()
        .client_id(client_id)
        .username(email)
        .password(password)
        .user_attributes(name_attr)
        .send()
        .await
        .map_err(|e| map_cognito_error(&format!("{:?}", e)))?;

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
) -> Result<(), String> {
    client
        .confirm_sign_up()
        .client_id(client_id)
        .username(email)
        .confirmation_code(code)
        .send()
        .await
        .map_err(|e| map_cognito_error(&format!("{:?}", e)))?;

    Ok(())
}

pub async fn sign_in(
    client: &Client,
    client_id: &str,
    email: &str,
    password: &str,
) -> Result<SignInResult, String> {
    let result = client
        .initiate_auth()
        .client_id(client_id)
        .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::UserPasswordAuth)
        .auth_parameters("USERNAME", email)
        .auth_parameters("PASSWORD", password)
        .send()
        .await
        .map_err(|e| map_cognito_error(&format!("{:?}", e)))?;

    let auth_result = result
        .authentication_result
        .ok_or_else(|| "AUTH_ERROR".to_string())?;

    let access_token = auth_result
        .access_token
        .ok_or_else(|| "AUTH_ERROR".to_string())?;

    let refresh_token = auth_result
        .refresh_token
        .ok_or_else(|| "AUTH_ERROR".to_string())?;

    Ok(SignInResult {
        access_token,
        refresh_token,
    })
}

pub async fn refresh_token(
    client: &Client,
    client_id: &str,
    refresh_token: &str,
) -> Result<SignInResult, String> {
    let result = client
        .initiate_auth()
        .client_id(client_id)
        .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::RefreshTokenAuth)
        .auth_parameters("REFRESH_TOKEN", refresh_token)
        .send()
        .await
        .map_err(|e| map_cognito_error(&format!("{:?}", e)))?;

    let auth_result = result
        .authentication_result
        .ok_or_else(|| "AUTH_ERROR".to_string())?;

    let access_token = auth_result
        .access_token
        .ok_or_else(|| "AUTH_ERROR".to_string())?;

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

pub async fn sign_out(client: &Client, access_token: &str) -> Result<(), String> {
    let result = client
        .global_sign_out()
        .access_token(access_token)
        .send()
        .await
        .map_err(|e| map_cognito_error(&format!("{:?}", e)));

    match result {
        Ok(_) => Ok(()),
        // cognito-local does not implement GlobalSignOut; treat as success.
        Err(ref e) if e == "UNSUPPORTED" => Ok(()),
        Err(e) => Err(e),
    }
}
