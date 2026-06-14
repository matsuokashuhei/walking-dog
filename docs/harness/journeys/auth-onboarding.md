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

An owner enters an email address, receives a six-digit one-time password, verifies
it without pressing an additional confirmation button, and reaches the
authenticated app with the expected Dogs, Walk, and Me surfaces.

## Acceptance Criteria

- The initial auth screen only asks for email.
- `requestOneTimePassword` returns the same shaped response for existing and new
  email addresses.
- The six-digit one-time password can be pasted or auto-filled into a single input.
- Filling all six digits automatically calls `verifyOneTimePassword`; there is no
  required confirm button for the happy path.
- Sign-in stores tokens through secure storage, not AsyncStorage.
- Authenticated navigation shows Dogs, Walk, and Me tabs.
- Invalid, expired, consumed, and network failures surface actionable errors
  without silently falling back to an authenticated state.
- Forgot password and change password surfaces are not present.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/auth-onboarding.yaml`.
- API: GraphQL request/verify one-time password request/response snippets with
  token values redacted.
- Mobile: screenshot of authenticated tabs and command output for auth tests.
- Observability: API logs showing the auth mutation path and no token values in
  logs.
