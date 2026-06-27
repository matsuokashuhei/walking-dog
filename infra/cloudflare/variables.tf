variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare zone ID for cacheandbuffer.com."
}

variable "root_domain" {
  type        = string
  description = "Cloudflare DNS zone name."
  default     = "cacheandbuffer.com"
}

variable "walking_dog_api_ipv4" {
  type        = string
  description = "IPv4 address for walking-dog.cacheandbuffer.com."
  default     = "133.167.103.109"
}

variable "cognito_email_domain" {
  type        = string
  description = "Amazon SES identity domain used by Cognito email delivery."
  default     = "walking-dog.cacheandbuffer.com"
}

variable "aws_region" {
  type        = string
  description = "AWS region used by Amazon SES."
  default     = "ap-northeast-1"
}

variable "ses_domain_verification_token" {
  type        = string
  description = "Amazon SES domain verification token for cognito_email_domain."
}

variable "ses_dkim_tokens" {
  type        = set(string)
  description = "Amazon SES DKIM tokens for cognito_email_domain."

  validation {
    condition     = length(var.ses_dkim_tokens) == 3
    error_message = "Amazon SES Easy DKIM must provide exactly three DKIM tokens."
  }
}

variable "ses_mail_from_domain" {
  type        = string
  description = "Amazon SES custom MAIL FROM domain."
  default     = "ses-bounce.walking-dog.cacheandbuffer.com"
}

variable "dmarc_policy" {
  type        = string
  description = "DMARC DNS TXT policy for the Cognito email domain."
  default     = "v=DMARC1; p=none;"
}
