# Cloudflare DNS setup for Amazon SES and Cognito

このディレクトリは、Cloudflare Dashboard で行う手動DNS設定の運用メモです。

対象:

- SES identity domain: `walking-dog.cacheandbuffer.com`
- Cognito sender: `Walking Dog <no-reply@walking-dog.cacheandbuffer.com>`
- SES custom MAIL FROM: `ses-bounce.walking-dog.cacheandbuffer.com`
- Runtime caller: Cognito user pool email configuration with `email_sending_account = "DEVELOPER"`

Cloudflare Email Routing / Email Sending は使いません。CloudflareはDNS管理だけを担当し、メール送信はAmazon SES、確認コード送信はCognito標準メール機能が担当します。

## Terraform command note

このrepoでは `.claude/skills/terraform/SKILL.md` に従い、TerraformはhostではなくDocker `hashicorp/terraform:1.14` で実行します。本文中の `terraform ...` はTerraform CLI引数の簡略表記です。実行時はrepo rootから以下の形式に置き換えます。

```bash
docker run --rm \
  -v "$(pwd)/infra/aws:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=personal \
  -w /workspace \
  hashicorp/terraform:1.14 <command>
```

## Setup flow

SES domain verificationはDNS反映を挟むため、初回は2段階で進めます。

1. TerraformでSES identityを作り、Cloudflareに入れるDNS recordを出力する。
2. Cloudflare DNSにSES verification / DKIM / MAIL FROM / DMARC recordsを追加する。
3. SES consoleでdomain identityとDKIMがverified/successfulになったことを確認する。
4. TerraformでCognitoをSES送信へ切り替える。
5. Cognito sign-up emailをE2E確認する。

## Bootstrap Terraform apply

SES identityを初めて作る時点ではDNSがまだ存在しないため、CognitoをSESへ切り替える前にDNS recordを取得します。

```bash
cd infra/aws

terraform apply \
  -var cognito_use_ses_email=false
```

Apply後、Cloudflareへ追加するDNS recordsを取得します。

```bash
terraform output -json ses_cloudflare_dns_records
```

`cognito_use_ses_email=false` はbootstrap用です。DNS検証後は既定値の `true` で運用します。

## Add records in Cloudflare

1. Cloudflare Dashboardにログインする。
2. `cacheandbuffer.com` または `walking-dog.cacheandbuffer.com` のDNS管理画面を開く。
3. `terraform output -json ses_cloudflare_dns_records` の各recordを追加する。
4. CNAME/MX/TXTはいずれも `DNS only` にする。
   - TXT/MXはproxy対象外です。
   - CNAMEもSES/DKIM検証用なのでproxyしないでください。

Terraform outputのrecordは同じshapeです。

```json
{
  "type": "TXT",
  "name": "_amazonses.walking-dog.cacheandbuffer.com",
  "value": "example-token",
  "priority": "",
  "proxy_status": "DNS only",
  "purpose": "SES domain ownership verification"
}
```

Cloudflare UIでの入力:

- `type`: DNS record type。
- `name`: Cloudflare zoneが `cacheandbuffer.com` の場合はFQDNのまま、またはUIが補完する場合はzone suffixを除いた名前で入力する。
- `value`: Terraform outputの値をそのまま入れる。
- `priority`: MX recordのみ `10` を入れる。
- `Proxy status`: `DNS only`。

## Expected DNS records

値は必ずTerraform outputまたはSES consoleの値を優先してください。特にDKIM tokenは環境ごとに変わります。

| Purpose | Type | Name | Value |
| --- | --- | --- | --- |
| SES domain verification | `TXT` | `_amazonses.walking-dog.cacheandbuffer.com` | SES verification token |
| SES Easy DKIM | `CNAME` x 3 | `<token>._domainkey.walking-dog.cacheandbuffer.com` | `<token>.dkim.amazonses.com` |
| SES custom MAIL FROM MX | `MX` | `ses-bounce.walking-dog.cacheandbuffer.com` | priority `10`, `feedback-smtp.ap-northeast-1.amazonses.com` |
| SES custom MAIL FROM SPF | `TXT` | `ses-bounce.walking-dog.cacheandbuffer.com` | `v=spf1 include:amazonses.com ~all` |
| DMARC starter policy | `TXT` | `_dmarc.walking-dog.cacheandbuffer.com` | `v=DMARC1; p=none;` |

DMARCは既存recordがある場合、重複作成せず既存recordを更新します。`p=none` は監視開始用です。配送が安定し、DMARC reportを確認できるようになってから `quarantine` / `reject` を検討します。

## DNS verification commands

```bash
dig TXT _amazonses.walking-dog.cacheandbuffer.com
dig CNAME '<dkim-token>._domainkey.walking-dog.cacheandbuffer.com'
dig MX ses-bounce.walking-dog.cacheandbuffer.com
dig TXT ses-bounce.walking-dog.cacheandbuffer.com
dig TXT _dmarc.walking-dog.cacheandbuffer.com
```

DKIM tokenは `terraform output -json ses_cloudflare_dns_records` またはSES consoleで確認します。

## Verify SES status

AWS Console:

1. Amazon SES consoleを開く。
2. Regionを `ap-northeast-1` にする。
3. `Verified identities` で `walking-dog.cacheandbuffer.com` を開く。
4. Identity statusが `Verified` になっていることを確認する。
5. DKIM statusが `Successful` になっていることを確認する。
6. Custom MAIL FROM domainが `Successful` になっていることを確認する。

SESはDNS反映に最大72時間かかる場合があります。Cloudflare DNSなら通常はもっと早く反映されます。

## Verify recipient email addresses for SES sandbox

SES sandbox中は、送信元domainがverifiedでも、送信先email addressもverifiedである必要があります。リリース前の検証では、受信に使うテスト用email addressをTerraform変数で指定します。

```bash
cd infra/aws

terraform apply \
  -var 'ses_sandbox_recipient_email_addresses=["you@example.com"]'
```

Terraformは各email addressにSES verification emailを送ります。受信者がメール内のverification linkをクリックすると、そのaddressがSESでverifiedになります。Terraformだけでリンククリック後の検証完了まではできません。

複数addressを指定する場合:

```bash
terraform apply \
  -var 'ses_sandbox_recipient_email_addresses=["you@example.com","another@example.com"]'
```

状態確認:

```bash
aws ses get-identity-verification-attributes \
  --region ap-northeast-1 \
  --profile personal \
  --identities you@example.com
```

実email addressはソースに固定せず、CLIの `-var` かローカル専用のtfvarsで渡します。指定したaddressはTerraform stateには保存されます。

## Move SES out of sandbox

Cognitoから実ユーザー宛に送るには、SES accountがsandbox外である必要があります。

AWS Console:

1. Amazon SES consoleを開く。
2. Regionを `ap-northeast-1` にする。
3. `Account dashboard` を開く。
4. Sending statusがsandboxの場合、production accessを申請する。

申請では、この用途がCognitoの認証・確認コード・パスワードリセットなどのtransactional emailであり、marketing emailではないことを明記します。

## Switch Cognito to SES

SES identity / DKIM / MAIL FROMが検証済みになったら、通常applyでCognitoをSESへ切り替えます。SES sandbox中でも、送信先email addressがverifiedなら検証用途で送信できます。本番リリース前にはsandbox解除が必要です。

```bash
cd infra/aws

terraform apply
```

`cognito_use_ses_email` の既定値は `true` です。明示する場合:

```bash
terraform apply \
  -var cognito_use_ses_email=true
```

このapplyでCognitoは以下の設定になります。

- `email_sending_account = "DEVELOPER"`
- `source_arn = arn:aws:ses:ap-northeast-1:<account-id>:identity/walking-dog.cacheandbuffer.com`
- `from_email_address = "Walking Dog <no-reply@walking-dog.cacheandbuffer.com>"`

Apply実行principalには、CognitoがSES用service-linked roleを作成するための `iam:CreateServiceLinkedRole` が必要です。すでに `AWSServiceRoleForAmazonCognitoIdpEmailService` が存在する場合は再作成されません。

## Test send

SES consoleから直接test emailを送ります。

1. SES consoleで `walking-dog.cacheandbuffer.com` identityを開く。
2. `Send test email` を選ぶ。
3. From local partに `no-reply` を指定する。
4. 宛先へ届くことを確認する。

次にCognito経由で確認します。

1. GraphQL `signUp` mutationを実行する。
2. `no-reply@walking-dog.cacheandbuffer.com` から確認コードメールが届くことを確認する。
3. 受信したcodeで `confirmSignUp` を実行する。
4. `changeEmail` / `confirmEmailChange` も確認する。

## Troubleshooting

- SES identityがverifiedにならない:
  - `_amazonses` TXTが正しいか確認する。
  - Cloudflare UIでzone suffixを二重入力していないか確認する。
  - TXT valueに余計な引用符や空白が入っていないか確認する。
- DKIMがsuccessfulにならない:
  - 3つのCNAMEがすべて `DNS only` になっているか確認する。
  - CNAMEのname/valueをSES consoleまたはTerraform outputと照合する。
- MAIL FROMがsuccessfulにならない:
  - MX priorityが `10` になっているか確認する。
  - MX valueが `feedback-smtp.ap-northeast-1.amazonses.com` になっているか確認する。
  - TXT valueが `v=spf1 include:amazonses.com ~all` になっているか確認する。
- Cognito applyがSES identity未検証で失敗する:
  - `terraform apply -var cognito_use_ses_email=false` でbootstrap applyを行う。
  - DNS追加とSES verification完了後に `terraform apply` を再実行する。
- Cognito applyが `iam:CreateServiceLinkedRole` で失敗する:
  - apply実行role/userに `iam:CreateServiceLinkedRole` を付与する。
- Cognito sign-up emailが外部宛に届かない:
  - SESがsandbox外か確認する。
  - SES account-level suppression listを確認する。
  - SES bounce/complaint metricsを確認する。

## References

- [Amazon Cognito email settings](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html)
- [Amazon Cognito service-linked roles](https://docs.aws.amazon.com/cognito/latest/developerguide/using-service-linked-roles.html)
- [Amazon SES domain identity verification](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#just-verify-domain-proc)
- [Amazon SES custom MAIL FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)
- [Cloudflare vendor-specific DNS records](https://developers.cloudflare.com/dns/manage-dns-records/reference/vendor-specific-records/)
