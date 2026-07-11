# Local Harness Runbook

Run commands from the repository root unless a command says otherwise.
Harness shell scripts require `jq`. The mobile Knip gate also requires
`apps/mobile` dependencies to be installed with `npm ci`.

## Start Per-Worktree Dev Stack

```bash
scripts/harness/dev-stack.sh up
```

The script writes `.harness-runs/dev-stack/env.json` with the compose project name
and per-worktree ports.

Stop and remove the current worktree's harness containers, networks, and named
volumes:

```bash
scripts/harness/dev-stack.sh down
```

This removes local Postgres, DynamoDB, MinIO, Cargo, and target-cache volumes for
the harness Compose project.

## Local API Authentication

Local API auth uses a dedicated real AWS Cognito user pool for the local
environment. Configure `apps/api/.env.local` with the Terraform local Cognito
outputs:

```bash
AWS_REGION=ap-northeast-1
AWS_COGNITO_USER_POOL_ID=<local_cognito_user_pool_id>
AWS_COGNITO_CLIENT_ID=<local_cognito_client_id>
```

The local API also uses the Cognito admin APIs to inspect and remove users
during the email one-time-password flow. Use the dedicated IAM role created by
the AWS Terraform module. The role is assumed from the `default` AWS SSO
profile, so the API receives temporary credentials and no long-lived access
key is created:

```bash
LOCAL_API_ROLE_ARN="$(docker run --rm \
  -v "$PWD/infra/aws:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  -w /workspace \
  hashicorp/terraform:1.14 output -raw local_api_iam_role_arn)"

aws configure set role_arn "$LOCAL_API_ROLE_ARN" --profile walking-dog-local
aws configure set source_profile default --profile walking-dog-local
aws configure set region ap-northeast-1 --profile walking-dog-local
aws sts get-caller-identity --profile walking-dog-local
```

Compose defaults the API and track-point worker to the `walking-dog-local`
profile. Override it explicitly with `AWS_PROFILE=<profile> scripts/harness/dev-stack.sh up`
only when intentionally testing another profile. The role can call only
`AdminGetUser` and `AdminDeleteUser` on the local Cognito user pool. It has no
Terraform, IAM, DynamoDB, S3, SQS, SES, or production Cognito permissions.

Fetch the values after applying `infra/aws`:

```bash
docker run --rm \
  -v "$PWD/infra/aws:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  -w /workspace \
  hashicorp/terraform:1.14 output -raw local_cognito_user_pool_id

docker run --rm \
  -v "$PWD/infra/aws:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=default \
  -w /workspace \
  hashicorp/terraform:1.14 output -raw local_cognito_client_id
```

Sign-up and sign-in send real Cognito email one-time passwords from the local
user pool. The API doesn't support a Cognito endpoint override. Authenticated
harness journeys must use a real Cognito access token from the same local user
pool configured in `apps/api/.env.local`.

## Health Check

```bash
curl -fsS "http://localhost:$(jq -r '.ports.api' .harness-runs/dev-stack/env.json)/health"
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
npm run knip
npm test -- --runInBand
```

Local simulator build order:

```bash
cd apps/mobile
npm run metro:kill
npm run ios:clean
npm run ios:sim:local:dev-stack
```

The dev-stack simulator build reads the API port from `.harness-runs/dev-stack/env.json`.

## API Journey Harness

```bash
export HARNESS_ACCESS_TOKEN="<real Cognito access token>"
scripts/harness/run-api-journey.sh walk-lifecycle
```

Evidence is written under `.harness-runs/journeys/`.

## Maestro Journey Harness

Preconditions:

- Maestro CLI is installed locally.
- The iOS app is installed with bundle id `com.walkingdog.app`.
- The app is built for the intended API URL.
- The simulator language is English for the current skeleton selectors.
- The simulator already has a valid Cognito auth state saved by normal app login.
- Seed data exists for flows that assume an authenticated owner and dogs.
- Location, camera, and photo permissions are controlled by the harness before
  walk and photo flows.

Run one journey:

Maestro flows preserve app state and use the saved Cognito auth state. Before the
first run on a fresh simulator or install, open the app and complete the normal
email one-time password login manually. Do not clear app state before running
Maestro.

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
