# JNY-001 Onboarding and Session

## Outcome

初めての利用者がemail OTPで登録・認証され、再起動後も安全にsessionを継続し、プロフィールと最初の犬の登録へ進めます。

## Context Sequence

1. App Shellが未認証routeとしてSign Up / Sign Inを表示する。
2. Identity & Accessがemail OTP challengeを作成し検証する。
3. 初回成功時にUserIdを発行し、UserRegisteredを公開する。
4. User Profileがeventから空のprofile/preferencesを作成する。
5. App Shellが認証済みtabへ切り替え、profile未設定なら編集導線を示す。
6. session期限時はrefresh rotationを行い、失敗時だけSign Inへ戻す。

## Boundary Contracts

Identity OTP/session operations、UserRegistered v1、User Profile Queries v1を使います。App ShellはOTP規則やprofile DBを知りません。

## Failure and Recovery

期限切れ・試行超過・rate limit・provider障害を区別します。refresh responseにaccess tokenまたはrotated refresh tokenが欠けた場合はsession成功にせず再認証します。再送でUserIdやprofileを重複作成しません。

## Acceptance

- 同じemailの大文字小文字差で別Userを作らない。
- OTPをlog、analytics、crash reportへ残さない。
- 初回profile作成が遅延しても認証成功を取り消さず、準備中状態から収束する。
- sign-out後は保護route、token、private cacheへアクセスできない。
