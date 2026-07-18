# Identity API Operations

## Commands

```graphql
requestEmailOtp(input: RequestEmailOtpInput!): EmailOtpChallenge!
verifyEmailOtp(input: VerifyEmailOtpInput!): AuthSession!
refreshSession(input: RefreshSessionInput!): AuthSession!
requestEmailChange(input: RequestEmailChangeInput!): EmailOtpChallenge!
verifyEmailChange(input: VerifyEmailChangeInput!): AuthSession!
signOut(input: SignOutInput!): SignOutResult!
```

全command inputは`requestId: UUID!`を持ちます。`verifyEmailOtp`は`intent: SIGN_UP | SIGN_IN`を要求し、challenge発行時のintentと一致させます。

## Directory Contract

```graphql
identityUser(userId: UUID!): IdentityUserStatus!
```

返すのは`userId`、`status`、`revision`だけです。email、provider subject、token claimsは他contextへ公開しません。

## Events

- `UserRegistered.v1`: event ID、UserId、occurredAt、revision
- `UserEmailChanged.v1`: event ID、UserId、occurredAt、revision。email値は含めない
- `UserDisabled.v1`: event ID、UserId、occurredAt、revision、reason category

