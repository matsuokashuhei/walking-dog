---
name: maestro-e2e
description: Run or debug walking-dog Maestro flows against the repository Testcontainers harness.
---

# Maestro E2E

Read the target flow and `docs/runbooks/local-harness.md` before acting. Required
API tests use isolated Testcontainers services and never production Compose or
live AWS.

## API kernel verification

PR 1 exposes no product API journey, so Maestro is not applicable. Verify its
architecture and self-owned service lifecycle instead:

```bash
cd apps/api
cargo xtask architecture check
cargo test --workspace --all-targets --all-features --locked
```

The adapter tests start and clean their own containers. Do not pre-start shared
PostgreSQL, MinIO, DynamoDB, or SQS services.

## Product-flow prerequisites

Only run a Maestro flow when a resident Testcontainers harness for that journey
has produced a typed environment manifest containing the API URL and seeded
resource identifiers. Read that manifest and pass its literal API URL when
building the mobile app; never infer a port or use production Compose.

```bash
cd apps/mobile
npm ci
npm run metro:kill
npm run ios:clean
EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_API_URL="<manifest-api-url>" \
  npx expo run:ios --configuration Release --device "iPhone 17 Pro"
```

Keep saved Cognito state only for flows whose preconditions explicitly require
it. Run flows from the repository root:

```bash
maestro test apps/mobile/e2e/maestro/<flow>.yaml
```

Do not hide failures with optional selectors or fallbacks. Fix the application,
harness state, or documented flow precondition. The resident harness owns
container cleanup; stop it through its typed lifecycle command rather than a
Compose command.
