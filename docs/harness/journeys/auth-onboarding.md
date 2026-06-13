# Journey: Auth Onboarding

## Product Axes

- 犬の体験: owner identity enables dog-specific personalization.
- データによる散歩の最大化: account ownership scopes dog, walk, goal, event, and photo data.
- 飼い主の貢献心: onboarding should feel like the first step toward walking care.
- Dog experience: creates the owner identity required before a dog profile, pack,
  or shared walk can be personalized.
- Data-maximized walks: establishes the account boundary that owns walk, goal, dog,
  event, and photo data.
- Owner contribution: makes the first-session path feel close to walking, not like
  account administration.

## Scope

A new owner creates an account, confirms email when required, signs in, and reaches
the authenticated app with the expected Dogs, Walk, and Me surfaces. A signed-in
owner can also change their password from Me and must sign in again afterward.

## Acceptance Criteria

- Registration requires display name, email, and a valid password.
- Terms and privacy links open the configured `/terms` and `/policy` URLs.
- Confirmation flow accepts the harness-provided verification code when Cognito
  requires confirmation.
- Sign-in stores tokens through secure storage, not AsyncStorage.
- Authenticated navigation shows Dogs, Walk, and Me tabs.
- Changing password requires the current password, a valid new password, and
  matching confirmation before submitting.
- Successful password change clears local auth and returns the owner to sign-in.
- Real Cognito invalidates sessions through `GlobalSignOut`; `cognito-local`
  supports `ChangePassword` but not `GlobalSignOut`, so local harness proof
  treats local token clearing as the enforced re-login boundary.
- Invalid credentials and network failures surface actionable errors without
  silently falling back to an authenticated state.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/auth-onboarding.yaml`.
- API: GraphQL sign-up, confirm, sign-in, and change-password request/response
  snippets with password variables redacted.
- Mobile: screenshot of authenticated tabs, password-change entry, and command
  output for auth tests.
- Observability: API logs showing the auth mutation path and no token values in
  logs.
