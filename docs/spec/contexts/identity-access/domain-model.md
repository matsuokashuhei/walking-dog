# Identity & Access Domain Model

## User

| Field | Type | Rule |
| --- | --- | --- |
| `user_id` | UUID | contextが発行する不透明な安定ID |
| `email` | string | trim後にlowercase、最大254 bytes、unique |
| `provider_subject` | string | Cognito `sub`、context外へ非公開、unique |
| `status` | enum | `active`または`disabled` |
| `email_verified` | boolean | active Userはtrue |
| `version` | integer | updateごとに1増える |

`UserId`はCognito subjectと別です。認証providerを置き換えても他contextのIDを変更しません。

## Email Challenge

| Field | Rule |
| --- | --- |
| `challenge_id` | clientへ返すopaque handle |
| `purpose` | `sign_up`、`sign_in`、`change_email` |
| `email` | normalized target email |
| `expires_at` | 発行から10分 |
| `attempts_remaining` | 5回から減算 |

OTPは6桁の数字です。OTP値とprovider sessionは永続DBへ保存せず、Cognito challengeに委譲します。

## Session Tokens

access tokenとrefresh tokenはclient secure storageだけへ保存します。refresh token rotationを必須にし、refresh成功時に古いrefresh tokenを新しいものへ置き換えます。

## Domain Invariants

- `IDA-010`: active Userはverified emailを一つだけ持ちます。
- `IDA-011`: email uniquenessはnormalized valueで判定します。
- `IDA-012`: provider subjectをAPI、event、logへ公開しません。
- `IDA-013`: 同じUserIdを別provider subjectへ再関連付けするときは明示的な管理migrationを必要とします。
- `IDA-014`: disabled Userへ新しいsessionを発行しません。
