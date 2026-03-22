# Auth via API — Design Spec

## Problem

Mobile app talks directly to Cognito (via `amazon-cognito-identity-js` SDK) for sign up, sign in, and sign out. When running Expo Web in Docker, the browser cannot resolve the Docker-internal hostname `cognito-local:9229`, causing Network Error.

## Solution

Move all auth operations to the Rust API server. The flow becomes:

```
Mobile → Rust API (GraphQL) → Cognito (or cognito-local)
```

The mobile app no longer needs Cognito connection details.

## Scope

- **In scope:** signUp, confirmSignUp, signIn, signOut mutations
- **Out of scope:** token refresh, password reset, social login

---

## API Changes (Rust)

### New Dependency

Add `aws-sdk-cognitoidentityprovider = "1"` to `Cargo.toml`.

### Config Changes (`src/config.rs`)

Add `cognito_client_id: String` field (read from `COGNITO_CLIENT_ID` env var). Required for Cognito `SignUp`, `ConfirmSignUp`, and `InitiateAuth` API calls.

### AWS Client (`src/aws/client.rs`)

Add `build_cognito_client()` function following the existing DynamoDB/S3 pattern. Uses `cognito_endpoint_url` (not `aws_endpoint_url`) for cognito-local support:

```rust
pub async fn build_cognito_client(region: &str, endpoint_url: Option<&str>) -> CognitoClient {
    // same pattern as build_dynamo_client
}
```

### AppState (`src/lib.rs`)

Add `cognito: CognitoClient` field to `AppState`. Initialize in `build_app()`.

### Auth Middleware Changes (`src/auth/mod.rs`)

Make authentication **optional**: if no `Authorization` header is present, continue without inserting `AuthUser` (instead of returning 401). The graphql_handler receives `Option<Extension<AuthUser>>` and inserts `cognito_sub` as `Option<String>` into the GraphQL context.

### Auth Guard Helper

Add `require_auth(ctx) -> Result<&String, Error>` helper function that:
- Extracts `Option<String>` from GraphQL context
- Returns `Err(GraphQL error "Unauthorized")` if `None`
- Returns `Ok(&cognito_sub)` if present

All existing resolvers change from `ctx.data::<String>()` to `require_auth(&ctx)?`.

### New Module: `src/auth/service.rs`

Auth service that wraps the Cognito SDK:

| Function | Cognito API | Returns |
|----------|-------------|---------|
| `sign_up(client, client_id, email, password, display_name)` | `SignUp` with `name` user attribute | `{ user_confirmed: bool }` |
| `confirm_sign_up(client, client_id, email, code)` | `ConfirmSignUp` | `()` |
| `sign_in(client, client_id, email, password)` | `InitiateAuth` (USER_PASSWORD_AUTH) | `{ access_token, refresh_token }` |
| `sign_out(client, access_token)` | `GlobalSignOut` | `()` |

**Token type note:** `InitiateAuth` returns `IdToken`, `AccessToken`, and `RefreshToken`. We return the actual `AccessToken` as `accessToken`. The existing JWT verification middleware works with AccessToken because both IdToken and AccessToken share the same issuer URL and `sub` claim, and the current validation does not check `aud` (audience).

**Error mapping:** Map Cognito SDK errors to user-friendly GraphQL errors:
- `UsernameExistsException` → "User already exists"
- `NotAuthorizedException` → "Invalid email or password"
- `CodeMismatchException` → "Invalid confirmation code"
- `InvalidPasswordException` → "Password does not meet requirements"
- Others → "Authentication error"

### GraphQL Mutations (`src/graphql/custom_mutations.rs`)

```graphql
type Mutation {
  signUp(input: SignUpInput!): SignUpOutput!
  confirmSignUp(input: ConfirmSignUpInput!): Boolean!
  signIn(input: SignInInput!): SignInOutput!
  signOut(accessToken: String!): Boolean!
  # ... existing mutations unchanged
}

input SignUpInput {
  email: String!
  password: String!
  displayName: String!
}

type SignUpOutput {
  success: Boolean!
  userConfirmed: Boolean!
}

input ConfirmSignUpInput {
  email: String!
  code: String!
}

input SignInInput {
  email: String!
  password: String!
}

type SignInOutput {
  accessToken: String!
  refreshToken: String!
}
```

**Auth requirements per mutation:**
- `signUp`, `confirmSignUp`, `signIn` — no auth required
- `signOut` — no auth required (takes accessToken as argument)
- All existing mutations — auth required (use `require_auth`)

### Schema Registration (`src/graphql/mod.rs`)

Register new types: `SignUpOutput`, `SignInOutput`, `SignUpInput`, `ConfirmSignUpInput`, `SignInInput`.

### Docker Compose (`apps/compose.yml`)

Add `COGNITO_CLIENT_ID` to the `api` service environment:

```yaml
COGNITO_CLIENT_ID: "1okgxxqodf1ltzperxirf9bp6"
```

---

## Mobile Changes

### Remove

- `lib/auth/cognito.ts` — delete (direct Cognito SDK calls)
- `amazon-cognito-identity-js` — remove from `package.json`
- Cognito config from `app.config.ts` (`cognitoUserPoolId`, `cognitoClientId`, `cognitoRegion`, `cognitoEndpointUrl`)
- Cognito env vars from `compose.yml` mobile service (`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_ENDPOINT_URL`, `COGNITO_REGION`)

### New: `lib/auth/api.ts`

Auth functions that call GraphQL mutations via the existing `graphqlClient`:

```typescript
signUp(email, password, displayName) → { success, userConfirmed }
confirmSignUp(email, code) → boolean
signIn(email, password) → { accessToken, refreshToken }
signOut(accessToken) → boolean
```

### Modify: `lib/graphql/mutations.ts`

Add `SIGN_UP_MUTATION`, `CONFIRM_SIGN_UP_MUTATION`, `SIGN_IN_MUTATION`, `SIGN_OUT_MUTATION`.

### Modify: `hooks/use-auth.ts`

Replace `cognito.*` calls with `api.*` calls. Interface stays the same.

### Modify: `stores/auth-store.ts`

Rename `token` → `accessToken` for clarity. Update all references.

### Modify: `lib/auth/secure-storage.ts`

Change key: `auth_id_token` → `auth_access_token`. Update `StoredTokens` interface.

### Modify: `app/(auth)/register.tsx`

After signUp, check `userConfirmed`:
- `true` (cognito-local with auto-confirm) → redirect to login
- `false` (production) → show ConfirmForm

Pass `userConfirmed` through `RegisterForm.onSuccess` callback.

### Keep: `components/auth/ConfirmForm.tsx`

Needed for production email verification. In local dev, cognito-local uses fixed code `9999`.

### Modify: `components/auth/RegisterForm.tsx`

Update `onSuccess` callback to pass `userConfirmed: boolean`.

---

## Data Flow

### Sign Up

```
Mobile                    API                      Cognito
  |                        |                         |
  |-- signUp mutation ---->|                         |
  |                        |-- SignUp API ---------->|
  |                        |    (email, password,    |
  |                        |     name attribute)     |
  |                        |<-- { userConfirmed } ---|
  |<-- SignUpOutput -------|                         |
  |                        |                         |
  | (if !userConfirmed)    |                         |
  |-- confirmSignUp ------>|                         |
  |                        |-- ConfirmSignUp ------->|
  |                        |<-- OK ------------------|
  |<-- true ---------------|                         |
```

### Sign In

```
Mobile                    API                      Cognito
  |                        |                         |
  |-- signIn mutation ---->|                         |
  |                        |-- InitiateAuth -------->|
  |                        |    (USER_PASSWORD_AUTH)  |
  |                        |<-- tokens --------------|
  |<-- SignInOutput -------|                         |
  |    (accessToken =      |                         |
  |     Cognito AccessToken)|                        |
  |                        |                         |
  | (store tokens,         |                         |
  |  set auth header)      |                         |
  |                        |                         |
  |-- other mutations ---->| (Bearer accessToken)    |
  |                        |-- verify JWT (JWKS) --->|
```

### Sign Out

```
Mobile                    API                      Cognito
  |                        |                         |
  |-- signOut mutation --->|                         |
  |    (accessToken)       |-- GlobalSignOut ------->|
  |                        |<-- OK ------------------|
  |<-- true ---------------|                         |
  |                        |                         |
  | (clear local tokens,   |                         |
  |  remove auth header)   |                         |
```

---

## i18n (Internationalization)

### Approach

- **Libraries:** `expo-localization` (device language detection) + `i18next` + `react-i18next`
- **Languages:** Japanese (ja) — default, English (en)
- **Strategy:** API returns error codes (e.g., `USER_EXISTS`, `INVALID_PASSWORD`). Mobile maps codes to localized messages.

### Error Code Mapping

| Cognito Exception | Error Code | ja | en |
|---|---|---|---|
| UsernameExistsException | `USER_EXISTS` | このメールアドレスは既に登録されています | This email is already registered |
| NotAuthorizedException | `INVALID_CREDENTIALS` | メールアドレスまたはパスワードが正しくありません | Invalid email or password |
| CodeMismatchException | `INVALID_CODE` | 確認コードが正しくありません | Invalid confirmation code |
| InvalidPasswordException | `INVALID_PASSWORD` | パスワードの要件を満たしていません | Password does not meet requirements |
| Other | `AUTH_ERROR` | 認証エラーが発生しました | Authentication error occurred |

---

## Local Development Notes

- cognito-local uses `USER_PASSWORD_AUTH` flow (no SRP)
- cognito-local auto-confirms users or accepts code `9999`
- API connects to `http://cognito-local:9229` via Docker network (server-to-server, no browser involved)
- The Network Error is resolved because the browser no longer communicates with Cognito directly
