variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "project_name" {
  type    = string
  default = "walking-dog"
}

# --- Cognito email via Amazon SES ---

variable "cognito_use_ses_email" {
  type        = bool
  description = "When true, Cognito sends user-pool emails through Amazon SES. Set false only while bootstrapping SES DNS verification records."
  default     = true
}

variable "cognito_email_domain" {
  type        = string
  description = "Domain identity verified in Amazon SES and used for Cognito email delivery."
  default     = "walking-dog.cacheandbuffer.com"
}

variable "cognito_email_from_address" {
  type        = string
  description = "FROM email address for Cognito confirmation emails. Must belong to cognito_email_domain."
  default     = "no-reply@walking-dog.cacheandbuffer.com"
}

variable "cognito_email_from_name" {
  type        = string
  description = "Display name for Cognito confirmation emails sent through Amazon SES."
  default     = "Walking Dog"
}

variable "cognito_email_mail_from_domain" {
  type        = string
  description = "Custom MAIL FROM subdomain for Amazon SES bounce handling and SPF alignment."
  default     = "ses-bounce.walking-dog.cacheandbuffer.com"
}

variable "ses_sandbox_recipient_email_addresses" {
  type        = set(string)
  description = "Email addresses to verify in Amazon SES for sandbox testing. Terraform requests verification emails; recipients must click the SES verification link."
  default     = []
}

# --- Cognito: Apple Sign-In ---

variable "apple_client_id" {
  type        = string
  description = "Apple Services ID (from Apple Developer Console)"
  default     = ""
}

variable "apple_team_id" {
  type        = string
  description = "Apple Developer Team ID"
  default     = ""
}

variable "apple_key_id" {
  type        = string
  description = "Apple Sign In Key ID"
  default     = ""
}

variable "apple_private_key" {
  type        = string
  description = "Apple Sign In private key (.p8 file contents)"
  sensitive   = true
  default     = ""
}

# --- Cognito: Google Sign-In ---

variable "google_client_id" {
  type        = string
  description = "Google OAuth 2.0 Client ID"
  default     = ""
}

variable "google_client_secret" {
  type        = string
  description = "Google OAuth 2.0 Client Secret"
  sensitive   = true
  default     = ""
}

# --- Cognito: App Client OAuth ---

variable "app_callback_urls" {
  type        = list(string)
  description = "OAuth callback URLs for mobile app deep links"
  default     = ["walkingdog://callback"]
}

variable "app_logout_urls" {
  type        = list(string)
  description = "OAuth logout redirect URLs"
  default     = ["walkingdog://logout"]
}

/*
# --- RDS ---

variable "db_name" {
  type    = string
  default = "walking_dog_dev"
}

variable "db_username" {
  type    = string
  default = "walking_dog"
}
*/
