# Use Case: Sign Up

## Requirement

`IDA-020`: 未登録emailのUserはSign Up画面からOTPを受け取り、検証後にactive Userを一人だけ作成できます。

## Flow

1. clientはtrim前のemail、locale、idempotency keyを送ります。
2. Identityはemailをnormalizeし、形式と長さを検証します。
3. 既存Userの有無を外部へ漏らさない共通responseでchallengeを返します。
4. UserがOTPを入力し、clientがchallenge IDとcodeを検証します。
5. Cognito verification成功後、IdentityはUserIdを発行して`users`へ保存します。
6. 同じtransactionで`UserRegistered v1`をOutboxへ記録します。
7. access token、refresh token、UserIdを返します。

同じprovider subjectが既にactive Userへ関連付いている場合は新規作成せず、既存Userのsessionを返します。

## Failure

形式不正は送信前に拒否します。provider unavailable、rate limited、expired code、invalid code、attempts exhaustedを区別します。失敗時にUser rowだけを残しません。

