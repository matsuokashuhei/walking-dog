# Domain Rules

These rules are repository contracts. Keep implementation, tests, and harness
evidence aligned with them.

## Walk Goals

- Walk goals are time-based, not distance-based.
- Store and edit goals through `dog_walk_goal.walk_amount.minutes` and
  `cycle_days`.
- `cycle_days = 1` means daily. `cycle_days = 7` means weekly.
- Distance is a separate walk statistic and must not become the goal primitive.
- Goal minute bounds are a shared API/mobile contract. Changes must update:
  `apps/api/src/service/dog_walk_goal.rs`,
  `apps/mobile/constants/walk.ts`, and their boundary tests together.

## Track Points

- Track point storage details live behind
  `service::track_point::TrackPointRepository`.
- GraphQL resolvers and queue handlers use the service/domain `TrackPoint`
  contract.
- DynamoDB table shape, timestamp encoding, and `AttributeValue` mapping must not
  leak into GraphQL or queue orchestration.

## Walk Lifecycle And Read Models

- Walk start, active-walk ownership, stop/finalize, distance finalization, and
  pagination totals belong in `service::walk` and
  `service::walk_read_model`.
- GraphQL translates inputs and outputs. It should not own lifecycle decisions,
  active-walk checks, aggregate SQL, or history semantics.

## Upload Storage

- Upload storage lives behind `service::storage::StorageGateway`.
- GraphQL may adapt `Upload` into `StorageUpload`.
- S3 clients, bucket/env handling, content-size policy, object keys, and avatar or
  photo URL construction stay in the storage service.

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
