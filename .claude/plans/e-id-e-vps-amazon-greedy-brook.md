# Eメール送信機能（SES + Custom Email Sender Lambda）

## Context

現在、アカウント作成時の確認コードは Cognito の `COGNITO_DEFAULT` 送信で配信されている（`infra/aws/cognito.tf:60`）。本番運用ではドメインから統一的にメールを送り、将来的にテンプレート・到達率をコントロールできる構成に切り替えたい。

今回の変更でローカル環境は対象外。さくらVPS環境（AWS dev）に Amazon SES を組み込み、Cognito の CustomEmailSender Lambda 経由で SES からドメイン `walkingdogdev.dpdns.org` を送信元として確認コードを送る。

### 決定事項（ユーザー確認済み）

- SES 送信元: **ドメイン検証** `walkingdogdev.dpdns.org`（DKIM/SPF は dpdns.org 側で手動追加）
- Cognito 連携: **Custom Email Sender Lambda + KMS**（Cognito の email テンプレートを完全制御）
- SES サンドボックス: **今回は解除申請しない**（開発中は検証済みアドレスにのみ送信）

## アーキテクチャ

```
[Mobile] signUp → [API /graphql signUp] → [Cognito SignUp]
                                               ↓ CustomEmailSender_SignUp event
                                          [Lambda (Node.js)]
                                               ↓ KMS decrypt(code) + SES send
                                          [Amazon SES] → ユーザーEメール
```

Cognito SignUp 時の動作:
1. Cognito が確認コードを生成
2. CustomEmailSender_SignUp イベントを Lambda に送信（コードは KMS で envelope 暗号化）
3. Lambda が AWS Encryption SDK でコードを復号
4. SES で日本語テンプレートのメールを組み立てて送信

## 変更対象ファイル

### Terraform 新規/変更（`infra/aws/`）

| ファイル | 操作 | 内容 |
|---|---|---|
| `ses.tf` | 新規 | `aws_ses_domain_identity`, `aws_ses_domain_dkim`, `aws_ses_email_identity`（sandbox 中の検証済みテスト宛先用） |
| `kms.tf` | 新規 | CustomEmailSender 用 KMS カスタマーマスターキー（symmetric）、Cognito サービス向け利用許可 policy |
| `lambda_custom_email_sender.tf` | 新規 | Lambda 関数定義（`archive_file` で zip 化）、IAM role（`ses:SendEmail`, `kms:Decrypt`, CloudWatch Logs）、Cognito 呼び出し許可 |
| `cognito.tf` | 変更 | `lambda_config.custom_email_sender` + `kms_key_id` を追加（`email_sending_account` は `COGNITO_DEFAULT` のまま — Custom Email Sender を使う場合 Cognito 自身は email を送らない） |
| `variables.tf` | 変更 | `ses_from_address`（例: `noreply@walkingdogdev.dpdns.org`）, `ses_from_name`（例: `WalkingDog`）, `email_domain` 変数を追加 |
| `outputs.tf` | 変更 | SES ドメイン検証トークン、DKIM CNAME、Lambda ARN を出力（手動DNS作業の参照用） |

### Lambda ソース新規（`infra/aws/lambda/custom-email-sender/`）

| ファイル | 内容 |
|---|---|
| `index.mjs` | ハンドラ。`triggerSource` で `CustomEmailSender_SignUp` / `CustomEmailSender_ResendCode` / `CustomEmailSender_ForgotPassword` を分岐。AWS Encryption SDK (`@aws-crypto/client-node`) でコード復号後、SES v2 (`@aws-sdk/client-sesv2`) で `SendEmail` |
| `package.json` | 依存: `@aws-crypto/client-node`, `@aws-sdk/client-sesv2` |
| `templates/signup-ja.mjs` | 件名・本文テンプレート（HTML + text）。コードと失効目安を埋め込み |
| `README.md` | ビルド・デプロイ手順（`npm ci --omit=dev && zip`） |

### Cargo/Rust 側

APIコードは**変更不要**。Cognito の `SignUp` / `ConfirmSignUp` 呼び出しは既存のまま（`apps/api/src/auth/service.rs:52`, `apps/api/src/auth/service.rs:85`）。送信経路のみインフラで差し替わる。

### ドキュメント

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/design/2026-04-18-ses-custom-email-sender.md` | 新規 | 設計概要、DNS 手動追加手順、SES サンドボックス下でテスト宛先を検証する運用、将来の本番申請・テンプレート拡張ロードマップ |
| `infra/sakura/README.md` | 変更 | さくらVPS側は変更不要である旨を追記（SES送信は Lambda 経由のため VPS IAM 権限は追加不要） |

## 実装手順

1. **SES domain identity を Terraform で作成**（`ses.tf`）。`terraform apply` 出力から DKIM CNAME 3本と SPF/verification TXT を取得
2. **DNS 手動追加**（dpdns.org 側ダッシュボード）。ユーザー作業
3. **KMS キー作成**（`kms.tf`）。key policy で Cognito サービスプリンシパル `cognito-idp.amazonaws.com` に `Encrypt` 許可
4. **Lambda ソース実装**（`infra/aws/lambda/custom-email-sender/index.mjs`）。`@aws-crypto/client-node` の `buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT)` + `KmsKeyringNode` で復号
5. **Lambda Terraform 定義**（`lambda_custom_email_sender.tf`）。`archive_file` data source で zip 生成 → `aws_lambda_function` → `aws_lambda_permission` で Cognito 呼び出し許可
6. **Cognito 更新**（`cognito.tf`）。`lambda_config { custom_email_sender { lambda_arn, lambda_version = "V1_0" } kms_key_id = ... }` を追加
7. **SES 検証済み宛先を追加**（開発テスト用）。`aws_ses_email_identity` で自分のメールアドレスを登録、確認クリック
8. **E2E テスト**。モバイルで signUp → 実機/検証済みメールで受信確認 → confirmSignUp 成功
9. **ドキュメント整備**

## 検証方法

- `terraform plan` でリソース差分確認（dev workspace）
- `terraform apply` 後、AWS Console で SES identity が `Pending verification` → DNS 追加後 `Verified` になること
- `aws lambda invoke` でサンプルイベント（`event.triggerSource = "CustomEmailSender_SignUp"`）を投げてエラーなし
- モバイルアプリで新規登録 → 検証済みアドレスにコードが届く（差出人が `noreply@walkingdogdev.dpdns.org`）
- コードで `confirmSignUp` が成功する（`apps/api/src/graphql/mutations/auth.rs:275`）
- CloudWatch Logs で Lambda のエラーなし、送信先/MessageId がログに残る

## 前提・制約

- **SES サンドボックス**: 送信先も検証済みでないと届かない。開発中はユーザー（自分）のテストアドレスを `aws_ses_email_identity` で登録。本番申請は別タスク
- **Cognito region**: SES は同リージョンで verify 必要（既存Cognito と同リージョンを前提）
- **dpdns.org の DNS 制約**: TXT/CNAME が追加できない場合、ドメイン検証戦略の見直しが必要（代替: 取得済み別ドメイン）
- Lambda のコールドスタックで signup レスポンスが数百ms遅延する可能性（許容範囲）

## 重要な参照

- 既存 Cognito 定義: `infra/aws/cognito.tf:60-66`
- signUp サービス: `apps/api/src/auth/service.rs:52`
- confirmSignUp サービス: `apps/api/src/auth/service.rs:85`
- モバイル登録画面: `apps/mobile/app/(auth)/register.tsx`
- 確認コード入力: `apps/mobile/components/auth/ConfirmForm.tsx`
- Terraform 実行ルール: `feedback_terraform_docker.md`（Docker 経由で実行）
