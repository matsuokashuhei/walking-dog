# Local Harness Runbook

Run commands from the repository root unless a command says otherwise.

## Start Per-Worktree Dev Stack

```bash
node scripts/harness/dev-stack.mjs up
```

The script writes `.harness-runs/dev-stack/env.json` with the compose project name
and per-worktree ports.

## Local Auth Issuer

Run a harness issuer when you need a signed local token without bypassing JWT
verification:

```bash
AWS_COGNITO_USER_POOL_ID=local_6fbc20 \
AWS_COGNITO_CLIENT_ID=walking-dog-harness \
node scripts/harness/local-auth.mjs
```

Mint a token:

```bash
curl -fsS http://localhost:9229/token \
  -H 'content-type: application/json' \
  -d '{"sub":"00000000-0000-7000-8000-000000000001"}'
```

Point the API at this issuer with `AWS_COGNITO_ENDPOINT=http://localhost:9229`
and the same `AWS_COGNITO_USER_POOL_ID`.

## Health Check

```bash
curl -fsS http://localhost:3000/health
```

## API Verification

Build the API image first if it does not exist:

```bash
cd apps
docker compose build api
```

Return to the repository root, then verify the current worktree with isolated
target cache. `$PWD` must be the repository root for this command:

```bash
docker run --rm \
  -v "$PWD":/walking-dog \
  -v apps_cargo_cache:/usr/local/cargo \
  -v apps_api_target_harness:/tmp/walking-dog-target \
  -w /walking-dog/apps/api \
  apps-api cargo test --target-dir /tmp/walking-dog-target -j 1
```

Use the isolated `target` volume when multiple worktrees or Cargo runs may be
sharing artifacts.

## Mobile Verification

```bash
cd apps/mobile
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
```

Local simulator build order:

```bash
cd apps/mobile
npm run metro:kill
npm run ios:clean
npm run ios:sim:local
```

The local simulator build points at `http://localhost:3000`.

## API Journey Harness

```bash
export HARNESS_ACCESS_TOKEN="<token from local auth issuer or signIn>"
node scripts/harness/run-api-journey.mjs walk-lifecycle
```

Evidence is written under `.harness-runs/journeys/`.

## Maestro Journey Harness

Preconditions:

- Maestro CLI is installed locally.
- The iOS app is installed with bundle id `com.walkingdog.app`.
- The app is built for the intended API URL.
- The simulator language is English for the current skeleton selectors.
- Seed data exists for flows that assume an authenticated owner and dogs.
- Location, camera, and photo permissions are controlled by the harness before
  walk and photo flows.

Run one journey:

```bash
maestro test apps/mobile/e2e/maestro/auth-onboarding.yaml
```

Run all current skeletons:

```bash
maestro test apps/mobile/e2e/maestro/*.yaml
```

## Evidence Capture

Attach these artifacts to the PR or review note:

- Command output for the relevant tests.
- `cd apps && docker compose logs --tail=200 api track-point-worker` when API,
  queue, or track-point behavior is touched.
- Maestro screenshots or video for user-facing journey changes.
- GraphQL request and response snippets for API contract changes.
- The architecture gate result from the PR template.
