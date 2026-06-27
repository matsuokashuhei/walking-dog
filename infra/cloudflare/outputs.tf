output "managed_dns_records" {
  description = "Cloudflare DNS records managed by this root module."
  value = {
    walking_dog_api = {
      name    = cloudflare_dns_record.walking_dog_api.name
      type    = cloudflare_dns_record.walking_dog_api.type
      content = cloudflare_dns_record.walking_dog_api.content
    }
    ses_domain_verification = {
      name    = cloudflare_dns_record.ses_domain_verification.name
      type    = cloudflare_dns_record.ses_domain_verification.type
      content = cloudflare_dns_record.ses_domain_verification.content
    }
    ses_dkim = {
      for token, record in cloudflare_dns_record.ses_dkim : token => {
        name    = record.name
        type    = record.type
        content = record.content
      }
    }
    ses_mail_from_mx = {
      name     = cloudflare_dns_record.ses_mail_from_mx.name
      type     = cloudflare_dns_record.ses_mail_from_mx.type
      content  = cloudflare_dns_record.ses_mail_from_mx.content
      priority = cloudflare_dns_record.ses_mail_from_mx.priority
    }
    ses_mail_from_spf = {
      name    = cloudflare_dns_record.ses_mail_from_spf.name
      type    = cloudflare_dns_record.ses_mail_from_spf.type
      content = cloudflare_dns_record.ses_mail_from_spf.content
    }
    ses_dmarc = {
      name    = cloudflare_dns_record.ses_dmarc.name
      type    = cloudflare_dns_record.ses_dmarc.type
      content = cloudflare_dns_record.ses_dmarc.content
    }
  }
}

output "terraform_import_addresses" {
  description = "Terraform resource addresses to use when importing existing Cloudflare DNS records."
  value = {
    walking_dog_api         = "cloudflare_dns_record.walking_dog_api"
    ses_domain_verification = "cloudflare_dns_record.ses_domain_verification"
    ses_dkim                = { for token in var.ses_dkim_tokens : token => "cloudflare_dns_record.ses_dkim[\"${token}\"]" }
    ses_mail_from_mx        = "cloudflare_dns_record.ses_mail_from_mx"
    ses_mail_from_spf       = "cloudflare_dns_record.ses_mail_from_spf"
    ses_dmarc               = "cloudflare_dns_record.ses_dmarc"
  }
}
