# Use Case: Change Email

## Requirement

`IDA-023`: authenticated Userは現在emailと異なる未使用emailをOTP検証後に採用できます。

## Flow

1. current UserIdとnew emailを受け取ります。
2. new emailをnormalizeし、現在値との差とuniquenessを検証します。
3. Cognitoがnew emailへOTPを送ります。
4. OTP成功後、Cognito emailをverifiedとして更新します。
5. local `users.email`とversionを更新し、`UserEmailChanged v1`をOutboxへ追加します。
6. 新しいclaimsを含むtokensを再発行してclientへ返します。

同時変更はexpected user versionで競合検出します。完了後のサインインemailは新emailだけです。
