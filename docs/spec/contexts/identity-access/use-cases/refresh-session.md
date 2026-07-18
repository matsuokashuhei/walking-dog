# Use Case: Refresh Session

## Requirement

`IDA-022`: access token期限切れ時、clientはrotating refresh tokenでsessionを更新します。

## Flow

1. clientはrefresh tokenをTLS channelでIdentityへ送ります。
2. IdentityはCognito `GetTokensFromRefreshToken`を呼びます。
3. access tokenと新refresh tokenの両方があることを検証します。
4. clientは両tokenを一つのsecure-storage transactionで置き換えます。

`ALLOW_REFRESH_TOKEN_AUTH`はapp clientへ設定しません。欠落token、replay拒否、revoked User、provider outageを成功に変換しません。terminal failureでは保存tokenを破棄し、Sign Inへ戻します。

