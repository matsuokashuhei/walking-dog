resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  user_pool_tier           = "ESSENTIALS"

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  mfa_configuration = "OFF"

  sign_in_policy {
    # Cognito currently rejects CreateUserPool/UpdateUserPool with EMAIL_OTP
    # as the only first factor because the service always has a password policy.
    # The app client and API expose only passwordless EMAIL_OTP.
    allowed_first_auth_factors = ["EMAIL_OTP", "PASSWORD"]
  }

  email_configuration {
    email_sending_account = var.cognito_use_ses_email ? "DEVELOPER" : "COGNITO_DEFAULT"
    from_email_address    = var.cognito_use_ses_email ? local.cognito_email_from : null
    source_arn            = var.cognito_use_ses_email ? aws_ses_domain_identity.cognito.arn : null
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- Cognito Domain (required for social login OAuth flow) ---

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# --- Apple Identity Provider ---

resource "aws_cognito_identity_provider" "apple" {
  count = var.apple_client_id != "" ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  provider_details = {
    client_id        = var.apple_client_id
    team_id          = var.apple_team_id
    key_id           = var.apple_key_id
    private_key      = var.apple_private_key
    authorize_scopes = "email name"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

# --- Google Identity Provider ---

resource "aws_cognito_identity_provider" "google" {
  count = var.google_client_id != "" ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "email profile openid"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

# --- App Client ---

locals {
  supported_identity_providers = concat(
    ["COGNITO"],
    var.apple_client_id != "" ? ["SignInWithApple"] : [],
    var.google_client_id != "" ? ["Google"] : [],
  )
}

resource "aws_cognito_user_pool_client" "app" {
  name         = "${var.project_name}-app"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_AUTH",
  ]

  refresh_token_rotation {
    feature                    = "ENABLED"
    retry_grace_period_seconds = 10
  }

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 3650

  token_validity_units {
    access_token  = "days"
    id_token      = "days"
    refresh_token = "days"
  }

  supported_identity_providers = local.supported_identity_providers

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = var.app_callback_urls
  logout_urls   = var.app_logout_urls

  depends_on = [
    aws_cognito_identity_provider.apple,
    aws_cognito_identity_provider.google,
  ]
}

# --- Local Cognito User Pool ---

resource "aws_cognito_user_pool" "local" {
  name = "${var.project_name}-local"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  user_pool_tier           = "ESSENTIALS"

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  mfa_configuration = "OFF"

  sign_in_policy {
    # Cognito currently rejects CreateUserPool/UpdateUserPool with EMAIL_OTP
    # as the only first factor because the service always has a password policy.
    # The app client and API expose only passwordless EMAIL_OTP.
    allowed_first_auth_factors = ["EMAIL_OTP", "PASSWORD"]
  }

  email_configuration {
    email_sending_account = var.cognito_use_ses_email ? "DEVELOPER" : "COGNITO_DEFAULT"
    from_email_address    = var.cognito_use_ses_email ? local.cognito_email_from : null
    source_arn            = var.cognito_use_ses_email ? aws_ses_domain_identity.cognito.arn : null
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  tags = {
    Environment = "local"
    Project     = var.project_name
  }
}

resource "aws_cognito_user_pool_client" "local_app" {
  name         = "${var.project_name}-local-app"
  user_pool_id = aws_cognito_user_pool.local.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_AUTH",
  ]

  refresh_token_rotation {
    feature                    = "ENABLED"
    retry_grace_period_seconds = 10
  }

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 3650

  token_validity_units {
    access_token  = "days"
    id_token      = "days"
    refresh_token = "days"
  }
}
