# Cloudflare DNS and Amazon SES for Cognito

This project sends Cognito confirmation emails through Amazon SES. Cloudflare is used only as the DNS provider for the SES verification, DKIM, custom MAIL FROM, SPF, and DMARC records.

Detailed Cloudflare dashboard steps are documented in `infra/cloudflare/README.md`.

## Architecture

1. Amazon SES verifies `walking-dog.cacheandbuffer.com` as a domain identity.
2. Cloudflare DNS hosts the SES verification TXT, DKIM CNAME, custom MAIL FROM MX/TXT, and DMARC TXT records.
3. Cognito user pool uses its standard email configuration with `email_sending_account = "DEVELOPER"`.
4. Cognito calls SES on behalf of the user pool and sends from `Walking Dog <no-reply@walking-dog.cacheandbuffer.com>`.

There is no Cognito `CustomEmailSender` Lambda and no Cloudflare Email Sending API token in this architecture.

## Terraform flow

First bootstrap SES records without switching Cognito:

```bash
cd infra/aws
terraform apply -var cognito_use_ses_email=false
terraform output -json ses_cloudflare_dns_records
```

Add the output records in Cloudflare DNS, then wait for SES identity, DKIM, and custom MAIL FROM verification.

After SES is verified:

```bash
cd infra/aws
terraform apply
```

The default `cognito_use_ses_email = true` switches Cognito to SES.

If the SES account is still in sandbox, each recipient email address must also be verified before Cognito can send to it. Terraform can request those verification emails:

```bash
cd infra/aws
terraform apply \
  -var 'ses_sandbox_recipient_email_addresses=["you@example.com"]'
```

AWS sends a verification email to each address. The recipient must click the verification link; Terraform cannot perform that final confirmation step. Keep real addresses out of committed files and pass them through `-var` or a local-only tfvars file. The addresses will still be stored in Terraform state.

## Required AWS permissions

The principal running the final `terraform apply` needs permission for Cognito to create the SES email service-linked role:

- `iam:CreateServiceLinkedRole`

The resulting role is `AWSServiceRoleForAmazonCognitoIdpEmailService` and lets Cognito call SES for user-pool emails.

## Verification

1. Send a test email from the SES console using `no-reply@walking-dog.cacheandbuffer.com`.
2. Request a login code through the GraphQL `requestOneTimePassword` mutation.
3. Confirm that the email arrives from `no-reply@walking-dog.cacheandbuffer.com`.
4. Use the received code with `verifyOneTimePassword`.
5. Repeat for email change flows (`changeEmail` / `confirmEmailChange`).
