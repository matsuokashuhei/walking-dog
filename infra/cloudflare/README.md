# Cloudflare DNS for cacheandbuffer.com

This Terraform root module manages Cloudflare DNS records for
`cacheandbuffer.com`.

Managed records:

- `walking-dog.cacheandbuffer.com` `A` record for the Sakura VPS API endpoint.
- Amazon SES domain verification `TXT` record for Cognito email delivery.
- Amazon SES Easy DKIM `CNAME` records.
- Amazon SES custom MAIL FROM `MX` and SPF `TXT` records.
- DMARC starter `TXT` record.

Cloudflare Email Routing / Email Sending is not used. Cognito sends
confirmation and OTP emails through Amazon SES; Cloudflare owns the DNS records
that verify and authenticate that sender domain.

## Terraform command note

Run Terraform through Docker from the repository root. This module stores state
in the existing S3 backend, so the command needs AWS credentials for the backend
and a Cloudflare API token for the provider.

```bash
docker run --rm \
  -v "$PWD/infra/cloudflare:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  --env-file "$PWD/infra/cloudflare/.env.local" \
  -w /workspace \
  hashicorp/terraform:1.14 <command>
```

Use a Cloudflare API token scoped to the `cacheandbuffer.com` zone with:

- `Zone:Read`
- `DNS:Edit`

## Initial setup

Create a local `terraform.tfvars` from the example:

```bash
cp infra/cloudflare/terraform.tfvars.example infra/cloudflare/terraform.tfvars
```

Create a local environment file for the Cloudflare API token:

```bash
cp infra/cloudflare/.env.example infra/cloudflare/.env.local
```

Edit `infra/cloudflare/.env.local` and replace the placeholder value. This file
is gitignored and must not be committed.

Fill in:

- `cloudflare_zone_id`: Cloudflare zone ID for `cacheandbuffer.com`.
- `ses_domain_verification_token`: Amazon SES verification token.
- `ses_dkim_tokens`: the three Amazon SES DKIM tokens.

The SES values come from the AWS root module:

```bash
docker run --rm \
  -v "$PWD/infra/aws:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  -w /workspace \
  hashicorp/terraform:1.14 output -json ses_cloudflare_dns_records
```

From that output:

- Use the `value` from the `SES domain ownership verification` record as
  `ses_domain_verification_token`.
- For each `SES Easy DKIM` record, take the token before
  `._domainkey.walking-dog.cacheandbuffer.com` and put it in
  `ses_dkim_tokens`.

## Import existing DNS records

The records already exist in Cloudflare. Do not run `apply` until every existing
record has been imported into this module's state; otherwise Terraform will try
to create duplicate DNS records.

Initialize the module first:

```bash
docker run --rm \
  -v "$PWD/infra/cloudflare:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  --env-file "$PWD/infra/cloudflare/.env.local" \
  -w /workspace \
  hashicorp/terraform:1.14 init
```

Find each Cloudflare DNS record ID in the dashboard or through the Cloudflare
API, then import it with the matching resource address:

```bash
docker run --rm \
  -v "$PWD/infra/cloudflare:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  --env-file "$PWD/infra/cloudflare/.env.local" \
  -w /workspace \
  hashicorp/terraform:1.14 import \
  cloudflare_dns_record.walking_dog_api \
  "$CLOUDFLARE_ZONE_ID/<walking-dog-a-record-id>"
```

Import addresses:

```text
cloudflare_dns_record.walking_dog_api
cloudflare_dns_record.ses_domain_verification
cloudflare_dns_record.ses_dkim["<first-dkim-token>"]
cloudflare_dns_record.ses_dkim["<second-dkim-token>"]
cloudflare_dns_record.ses_dkim["<third-dkim-token>"]
cloudflare_dns_record.ses_mail_from_mx
cloudflare_dns_record.ses_mail_from_spf
cloudflare_dns_record.ses_dmarc
```

Use the same import ID shape for every DNS record:

```text
<cloudflare-zone-id>/<dns-record-id>
```

After importing all records, verify that Terraform sees no drift:

```bash
docker run --rm \
  -v "$PWD/infra/cloudflare:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  --env-file "$PWD/infra/cloudflare/.env.local" \
  -w /workspace \
  hashicorp/terraform:1.14 plan
```

`plan` should report no changes. If it wants to create a record, that record has
not been imported. If it wants to update a record, compare the Terraform value
with Cloudflare before applying.

## Expected DNS records

| Purpose | Type | Name | Value |
| --- | --- | --- | --- |
| Walking Dog API | `A` | `walking-dog.cacheandbuffer.com` | `133.167.103.109` |
| SES domain verification | `TXT` | `_amazonses.walking-dog.cacheandbuffer.com` | SES verification token |
| SES Easy DKIM | `CNAME` x 3 | `<token>._domainkey.walking-dog.cacheandbuffer.com` | `<token>.dkim.amazonses.com` |
| SES custom MAIL FROM MX | `MX` | `ses-bounce.walking-dog.cacheandbuffer.com` | priority `10`, `feedback-smtp.ap-northeast-1.amazonses.com` |
| SES custom MAIL FROM SPF | `TXT` | `ses-bounce.walking-dog.cacheandbuffer.com` | `v=spf1 include:amazonses.com ~all` |
| DMARC starter policy | `TXT` | `_dmarc.walking-dog.cacheandbuffer.com` | `v=DMARC1; p=none;` |

All records stay DNS-only. Do not proxy the SES/DKIM/MX/TXT records. Keep
`walking-dog.cacheandbuffer.com` DNS-only while the Sakura VPS Caddy setup owns
TLS issuance directly.

## SES verification flow

When bootstrapping a new SES identity:

1. Run the AWS module with `cognito_use_ses_email=false` to create the SES
   identity without switching Cognito to SES.
2. Copy the SES verification token and DKIM tokens into
   `infra/cloudflare/terraform.tfvars`.
3. Apply this Cloudflare module.
4. Wait for SES identity, DKIM, and custom MAIL FROM verification to succeed.
5. Run the AWS module again with the default `cognito_use_ses_email=true`.

## Verification

DNS checks:

```bash
dig TXT _amazonses.walking-dog.cacheandbuffer.com
dig CNAME '<dkim-token>._domainkey.walking-dog.cacheandbuffer.com'
dig MX ses-bounce.walking-dog.cacheandbuffer.com
dig TXT ses-bounce.walking-dog.cacheandbuffer.com
dig TXT _dmarc.walking-dog.cacheandbuffer.com
dig A walking-dog.cacheandbuffer.com
```

AWS checks:

1. In the Amazon SES console, confirm that the
   `walking-dog.cacheandbuffer.com` identity is verified.
2. Confirm DKIM is successful.
3. Confirm custom MAIL FROM is successful.
4. Run the Cognito email OTP flow through GraphQL.
