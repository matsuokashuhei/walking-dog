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

A new or returning owner lands on a sign-in screen, can choose the sign-up
screen when they are new, enters email, verifies the email one-time password,
and reaches the authenticated app with the expected Dogs, Walk, and Me
surfaces. The backend continues to create a Cognito and `users` row
automatically when the email is not registered.

## Acceptance Criteria

- Authentication requires email only.
- The initial auth UI separates sign-in and sign-up screens so owners can choose
  the path that matches their intent.
- Sign-up uses the same email one-time password flow and does not ask for name,
  password, dog profile, or other new account fields.
- Terms and privacy links open the configured `/terms` and `/policy` URLs.
- Email one-time password accepts the operator-provided AWS Cognito code.
- Completing the one-time password automatically verifies without a
  separate confirm button.
- Successful verification stores tokens through secure storage, not AsyncStorage.
- Authenticated navigation shows Dogs, Walk, and Me tabs.
- Forgot password, reset password, and change password controls are not present.
- Invalid, expired, or already-consumed one-time password attempts surface
  actionable errors and allow re-entry.
- Network failures surface actionable errors without silently falling back to an
  authenticated state.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/auth-onboarding.yaml`.
- API: GraphQL `requestOneTimePassword` and `verifyOneTimePassword` request/response
  snippets with `session`, `code`, access token, and refresh token redacted.
- Mobile: screenshot of authenticated tabs and command output for auth tests.
- Observability: API logs showing the auth mutation path and no token values in
  logs.
