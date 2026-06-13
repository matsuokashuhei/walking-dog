# Harness-First Development Architecture

Harness-first development means the journey contract is written before code is
accepted as done. The harness is not a separate test layer; it is the executable
proof that product intent, domain rules, mobile UX, API behavior, and observability
line up.

## Layer Map

1. Product principles define why the work exists.
2. Journey files in `docs/harness/journeys/` define what the user must be able to do.
3. Maestro flows in `apps/mobile/e2e/maestro/` exercise the mobile journey.
4. Mobile screens translate user intent into GraphQL calls and local state.
5. GraphQL adapts requests and responses.
6. API services own domain decisions and storage boundaries.
7. Postgres, DynamoDB, SQS, Cognito, and S3/MinIO are infrastructure details behind
   service contracts.

## Completion Gate

A change is complete only when the pull request can show:

- Product axis: the affected axis and user-visible improvement.
- Journey evidence: Maestro, unit, API, or manual harness evidence.
- Observability evidence: logs, screenshots, request/response samples, or command
  output that proves the system state.
- Architecture gate: pass or needs work for the touched boundary.

## Boundary Expectations

- Do not hide defects with optional fields, broad `try/catch`, or fallback values.
  Fix the root cause and add proof.
- Keep storage mechanics behind repositories or gateways.
- Keep walk lifecycle and history semantics in service modules.
- Keep mobile UX aligned with existing Expo Router, native UI, secure storage, and
  theme-token rules.
- Keep legal hosting on Sakura/Caddy unless the product requirement explicitly
  changes that architecture.

## Harness Evidence Types

- Maestro flow output for end-to-end user journeys.
- API `cargo test` output for service and resolver behavior.
- Mobile Jest, lint, and typecheck output for screen and hook behavior.
- Docker Compose logs for API, worker, queue, storage, and auth interactions.
- Screenshots for owner-facing contribution, walk history, and photo/event surfaces.
