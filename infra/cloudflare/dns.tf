resource "cloudflare_dns_record" "walking_dog_api" {
  zone_id = var.cloudflare_zone_id
  name    = "walking-dog.${var.root_domain}"
  type    = "A"
  content = var.walking_dog_api_ipv4
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "ses_domain_verification" {
  zone_id = var.cloudflare_zone_id
  name    = "_amazonses.${var.cognito_email_domain}"
  type    = "TXT"
  content = "\"${var.ses_domain_verification_token}\""
  ttl     = 1
}

resource "cloudflare_dns_record" "ses_dkim" {
  for_each = var.ses_dkim_tokens

  zone_id = var.cloudflare_zone_id
  name    = "${each.key}._domainkey.${var.cognito_email_domain}"
  type    = "CNAME"
  content = "${each.key}.dkim.amazonses.com"
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "ses_mail_from_mx" {
  zone_id  = var.cloudflare_zone_id
  name     = var.ses_mail_from_domain
  type     = "MX"
  content  = "feedback-smtp.${var.aws_region}.amazonses.com"
  priority = 10
  ttl      = 1
}

resource "cloudflare_dns_record" "ses_mail_from_spf" {
  zone_id = var.cloudflare_zone_id
  name    = var.ses_mail_from_domain
  type    = "TXT"
  content = "\"v=spf1 include:amazonses.com ~all\""
  ttl     = 1
}

resource "cloudflare_dns_record" "ses_dmarc" {
  zone_id = var.cloudflare_zone_id
  name    = "_dmarc.${var.cognito_email_domain}"
  type    = "TXT"
  content = "\"${var.dmarc_policy}\""
  ttl     = 1
}
