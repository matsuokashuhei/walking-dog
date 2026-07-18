# Identity & Access

## Purpose

Userの本人性とsessionを安全に確立します。

## Product Axes

- 犬の体験: 正しいUserへ犬と散歩を関連付ける基盤です。
- データによる散歩の最大化: user identityを一貫して追跡します。
- 飼い主の貢献心: 再ログイン負担を抑え、安全に継続利用できます。

## Owns

registration、email OTP、authentication、token rotation、email change、sign-out、UserId。

## Does Not Own

display name、avatar、preferences、dogs、walks。

## Published Contracts

Identity Directory v1とUser lifecycle events。

## Consumed Contracts

外部product context contractは消費しません。

## Allowed Dependencies

Cognito adapter、mail delivery、clock、cryptography、observability。

## Reading Scope

このcontextと利用するCognito仕様だけを読みます。
