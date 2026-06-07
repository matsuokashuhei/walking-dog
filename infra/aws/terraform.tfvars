environment  = "dev"
project_name = "walking-dog"
aws_region   = "ap-northeast-1"
domain_name  = "walking-dog.cacheandbuffer.com"

# Cognito email through Amazon SES
# If SES DNS records are not verified yet, run the bootstrap apply with:
# cognito_use_ses_email = false
ses_sandbox_recipient_email_addresses = [
  "matsuokashuheiii@gmail.com",
  "matzuokashuhei@gmail.com",
]

# Cognito social login credentials
# Set via TF_VAR_ environment variables or uncomment and fill in:
# apple_client_id   = ""
# apple_team_id     = ""
# apple_key_id      = ""
# apple_private_key = ""
# google_client_id     = ""
# google_client_secret = ""
