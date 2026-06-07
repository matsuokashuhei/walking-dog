# --- Amazon SES for Cognito email delivery ---

locals {
  cognito_email_from = "${var.cognito_email_from_name} <${var.cognito_email_from_address}>"

  ses_cloudflare_dns_records = concat(
    [
      {
        type         = "TXT"
        name         = "_amazonses.${var.cognito_email_domain}"
        value        = aws_ses_domain_identity.cognito.verification_token
        priority     = ""
        proxy_status = "DNS only"
        purpose      = "SES domain ownership verification"
      },
    ],
    [
      for token in aws_ses_domain_dkim.cognito.dkim_tokens : {
        type         = "CNAME"
        name         = "${token}._domainkey.${var.cognito_email_domain}"
        value        = "${token}.dkim.amazonses.com"
        priority     = ""
        proxy_status = "DNS only"
        purpose      = "SES Easy DKIM"
      }
    ],
    [
      {
        type         = "MX"
        name         = var.cognito_email_mail_from_domain
        value        = "feedback-smtp.${var.aws_region}.amazonses.com"
        priority     = "10"
        proxy_status = "DNS only"
        purpose      = "SES custom MAIL FROM bounce handling"
      },
      {
        type         = "TXT"
        name         = var.cognito_email_mail_from_domain
        value        = "v=spf1 include:amazonses.com ~all"
        priority     = ""
        proxy_status = "DNS only"
        purpose      = "SES custom MAIL FROM SPF"
      },
      {
        type         = "TXT"
        name         = "_dmarc.${var.cognito_email_domain}"
        value        = "v=DMARC1; p=none;"
        priority     = ""
        proxy_status = "DNS only"
        purpose      = "DMARC monitoring starter policy"
      },
    ],
  )
}

resource "aws_ses_domain_identity" "cognito" {
  domain = var.cognito_email_domain
}

resource "aws_ses_domain_dkim" "cognito" {
  domain = aws_ses_domain_identity.cognito.domain
}

resource "aws_ses_domain_mail_from" "cognito" {
  domain                 = aws_ses_domain_identity.cognito.domain
  mail_from_domain       = var.cognito_email_mail_from_domain
  behavior_on_mx_failure = "RejectMessage"
}

resource "aws_ses_email_identity" "sandbox_recipients" {
  for_each = var.ses_sandbox_recipient_email_addresses

  email = each.value
}
