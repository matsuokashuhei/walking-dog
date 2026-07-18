# Use Case: Sign In

## Requirement

`IDA-021`: active Userはverified emailへのOTPで同じUserIdへサインインできます。

## Flow

1. emailをnormalizeしてchallengeを要求します。
2. responseはUser存在の有無を明かしません。
3. OTP検証成功時、provider subjectからUserを解決します。
4. Userがactiveか確認し、tokensとUserIdを返します。
5. clientはtokensをsecure storageへatomically保存してApp Shellへauthenticated状態を通知します。

登録されていないemail、disabled User、provider subject不一致は同じ外部error category `AUTHENTICATION_REJECTED`にします。内部diagnosticだけを区別します。
