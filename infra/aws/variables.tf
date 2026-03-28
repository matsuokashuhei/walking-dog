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

# --- RDS ---

variable "db_name" {
  type    = string
  default = "walking_dog_dev"
}

variable "db_username" {
  type    = string
  default = "walking_dog"
}
