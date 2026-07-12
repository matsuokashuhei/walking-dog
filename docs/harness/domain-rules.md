# Domain Rules

These rules are repository contracts. Keep implementation, tests, and harness
evidence aligned with them.

## Walk Goals

- Walk goals are time-based, not distance-based.
- Store and edit goals through `dog_walk_goal.walk_amount.minutes` and
  `cycle_days`.
- `cycle_days = 1` means daily. `cycle_days = 7` means weekly.
- Distance is a separate walk statistic and must not become the goal primitive.
- Goal minute bounds are a shared API/mobile contract. When the API behavior is
  introduced, domain invariants belong in `apps/api/crates/domain`, orchestration
  belongs in `apps/api/crates/application`, and adapter details stay outside both.
  Changes must update `apps/mobile/constants/walk.ts` and boundary tests on both
  sides together.

## Track Points

- Track point storage details must live behind an application-owned port in
  `apps/api/crates/application`; provider implementations belong in adapter
  crates such as `adapter-aws-dynamodb`.
- GraphQL and queue adapters translate to domain/application contracts rather
  than exposing provider representations.
- DynamoDB table shape, timestamp encoding, and `AttributeValue` mapping must not
  leak into GraphQL or queue orchestration.

## Walk Lifecycle And Read Models

- Walk start, active-walk ownership, stop/finalize, distance finalization, and
  pagination semantics belong in domain rules and application use cases when
  those product slices are implemented.
- GraphQL translates inputs and outputs. It should not own lifecycle decisions,
  active-walk checks, aggregate SQL, or history semantics.

## Upload Storage

- Upload storage must live behind an application-owned port; S3 implementation
  belongs in `apps/api/crates/adapter-aws-s3`.
- GraphQL may translate transport uploads into an application input type.
- S3 clients, bucket/env handling, content-size policy, object keys, and avatar or
  photo URL construction stay in the adapter/application boundary selected by
  the relevant use case, never in GraphQL transport code.

## Cognito Email

- Cognito email delivery uses Amazon SES.
- Domain DNS records are managed in Cloudflare.
- Cloudflare dashboard runbooks belong under `infra/cloudflare`.
- Cloudflare API tokens are not required for Cognito email delivery.

## Legal Hosting

- Draft legal documents belong in `docs/legal/`.
- Draft-only legal work must not change app legal URLs, registration behavior, or
  settings behavior unless explicitly requested.
- Published Sakura legal pages live under `infra/sakura/legal/`.
- Sakura serves `/terms` and `/policy` through Caddy. Do not add API routes for
  legal document hosting.
