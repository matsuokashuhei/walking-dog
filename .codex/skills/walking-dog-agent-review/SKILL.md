---
name: walking-dog-agent-review
description: Use when reviewing walking-dog repository changes for product fit, architecture boundaries, API reliability, mobile UX, security/privacy, PR readiness, or Harness Engineering journey evidence.
---

# Walking Dog Agent Review

Use this skill for walking-dog code, docs, harness, or PR reviews. Review for
root cause, product fit, and repository boundaries before style preferences.

## Required Context

Read the diff first, then load only the relevant docs:

- Product: `docs/product/principles.md`
- Domain rules: `docs/harness/domain-rules.md`
- Architecture: `docs/architecture/harness-first-development.md`
- Journey contract: `docs/harness/journeys/<journey>.md`
- Runbook: `docs/runbooks/local-harness.md`

## Review Modes

### Product

Check whether the change improves at least one product axis:

- Dog experience: dog identity, dog-to-dog encounters, pack context, or shared walk
  quality.
- Data-maximized walks: route, duration, event, photo, goal, history, or aggregate
  data that can improve future walks.
- Owner contribution: visible proof that the owner helped the dog and should keep
  walking.

Flag PRs that mention a product axis but provide no journey evidence.

### Architecture

Check boundary ownership:

- Walk goals are time-based: `minutes` plus `cycle_days`, not distance.
- Track point storage stays behind `service::track_point::TrackPointRepository`.
- Walk lifecycle and history semantics stay in `service::walk` and
  `service::walk_read_model`.
- Upload storage stays behind `service::storage::StorageGateway`.
- GraphQL translates inputs/outputs and does not own storage or lifecycle policy.
- Legal pages stay on Sakura/Caddy at `/terms` and `/policy`.

Flag hidden workarounds such as broad fallbacks, optionalizing required data, or
catching errors without fixing the cause.

### API Reliability

Check:

- Ownership and authorization for user, dog, walk, and active-walk operations.
- Transaction boundaries for multi-row lifecycle changes.
- Idempotency and retry behavior for SQS and track-point writes.
- Validation in service modules, especially goal bounds and walk ownership.
- Error responses that preserve actionable causes without leaking secrets.
- Tests for success and failure paths when behavior changes.

### Mobile UX

Check:

- Expo Router route ownership and navigation consistency.
- Secure token storage; never store sensitive tokens in AsyncStorage.
- Theme tokens for styling; no magic values where tokens should exist.
- Native-feeling controls for settings, forms, sheets, and walk surfaces.
- Stable accessibility labels or `testID` values for harness flows.
- Walk map shell continuity during START to recording transitions.
- Location, camera, and photo permission paths that do not fake success.

### Security/Privacy

Check:

- No access tokens, refresh tokens, raw confirmation codes, or PII in logs.
- Photo and avatar uploads use the storage gateway and configured buckets.
- Public URLs expose only intended avatar/photo/legal assets.
- Auth failures do not fall back to authenticated state.
- Legal links still point at the configured `/terms` and `/policy` URLs.

## Output Format

Lead with findings, ordered by severity. Use file and line references when
available.

For each finding include:

- Severity: P0, P1, P2, or P3.
- Mode: Product, Architecture, API Reliability, Mobile UX, or Security/Privacy.
- Problem: concrete behavior or risk.
- Required evidence or fix.

Then include:

- Open questions.
- Missing journey or observability evidence.
- Short summary only after findings.

If there are no findings, say so and name any residual test or harness gaps.
