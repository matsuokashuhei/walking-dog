# API and Mobile Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `apps/api` and `apps/mobile` with the PR #366/#367 architecture
and make every normalized `docs/tmp-testcases/` outcome executable through seven
canonical iOS Journeys.

**Architecture:** Three deployable foundation pull requests establish the API
kernel, Mobile kernel, and deterministic contract/Harness. Seven vertical pull
requests then deliver one canonical Journey each through API, GraphQL, Mobile,
Harness, observability, and evidence. One final pull request deletes residue and
proves the complete matrix.

**Tech Stack:** Rust 1.96.0 edition 2024, Axum, async-graphql, SeaORM/PostgreSQL,
AWS SDK adapters, Testcontainers, MinIO, ElasticMQ, DynamoDB Local, Toxiproxy,
OpenTelemetry, Expo 56, React Native 0.85, TypeScript 6, Expo Router, XState,
TanStack Query, SQLite, SecureStore, GraphQL Code Generator, Jest, Maestro, iOS
18.3 and 26.5 Simulators.

## Global Constraints

- Initial Mobile acceptance is iOS only with deployment target 18.0.
- Existing GraphQL, Mobile source/runtime, device data, and production data are
  not preserved; there is no production data.
- Migration cost, diff size, and reuse are not constraints.
- Every merge builds, starts, and truthfully exposes only completed Journeys.
- Domain decisions live in API domain/application modules, never resolvers or
  adapters; storage details stay behind ports.
- Mobile routes compose public Feature interfaces only; no deep imports, global
  mutable store, handwritten GraphQL, or generated transport type outside
  adapters.
- Every product mutation is idempotent. Required values never become optional or
  fallback values. Errors are never caught and ignored.
- Required CI never calls live AWS. Production Cognito mapping is tested through
  a deterministic compatible provider; real-provider contracts are separate.
- Tokens, OTPs, challenges, Email Addresses, signed URLs, object keys,
  idempotency keys, unnecessary PII, and precise location are forbidden from
  logs/evidence.
- Every user-facing route follows the approved artifact
  `docs/wayfinder/artifacts/2026-07-11-mobile-journey-wireflow.html` until a later
  reviewed design artifact supersedes it.
- Each pull request uses one immutable intent under the relevant
  `architecture/intents/` directory and closes without TODO/TBD, warning gates,
  compatibility aliases, dual runtimes, or expired exceptions.

## Sources of truth

- Domain: `CONTEXT.md`
- Normalized behavior:
  `docs/wayfinder/2026-07-11-acceptance-spec-normalization.md`
- Ownership: `docs/wayfinder/2026-07-11-domain-journey-ownership-map.md`
- API kernel: `docs/wayfinder/2026-07-11-api-architecture-kernel.md`
- Mobile kernel: `docs/wayfinder/2026-07-11-mobile-architecture-kernel.md`
- GraphQL: `docs/wayfinder/2026-07-11-graphql-contract-and-generation.md`
- Harness:
  `docs/wayfinder/2026-07-11-deterministic-acceptance-observability-harness.md`
- PR order:
  `docs/wayfinder/2026-07-11-deployable-vertical-migration-sequence.md`

## Exact Journey scenario ledger

For each basename below, create both
`apps/mobile/journeys/<journey>/fixtures/<basename>.yaml` and
`apps/mobile/e2e/maestro/journeys/<journey>/<basename>.yaml`:

| Journey directory | Required basenames |
| --- | --- |
| `access-account` | `success`, `validation`, `transport-recovery`, `persistence-recovery`, `privacy-evidence` |
| `manage-owner-profile-and-preferences` | `success`, `validation`, `permission`, `transport-recovery`, `persistence-recovery`, `empty-loading-error`, `accessibility`, `language-theme-units`, `privacy-evidence` |
| `manage-dogs-and-goals` | `success`, `validation`, `permission`, `transport-recovery`, `persistence-recovery`, `empty-loading-error`, `accessibility`, `language-theme-units`, `privacy-evidence` |
| `record-a-walk` | `success`, `validation`, `permission`, `transport-recovery`, `persistence-recovery`, `empty-loading-error`, `accessibility`, `language-theme-units`, `privacy-evidence` |
| `capture-walk-events` | `success`, `validation`, `permission`, `transport-recovery`, `persistence-recovery`, `accessibility`, `privacy-evidence` |
| `review-walk-history` | `success`, `validation`, `transport-recovery`, `empty-loading-error`, `accessibility`, `language-theme-units`, `privacy-evidence` |
| `review-owner-contribution` | `success`, `transport-recovery`, `empty-loading-error`, `accessibility`, `language-theme-units`, `privacy-evidence` |

No other scenario basename is created without updating the canonical Journey,
Feature manifest, selection fixtures, and this ledger in the same pull request.

---

## PR 1 — API architecture kernel

### Task 1.1: Replace the Cargo root and legacy product crates

**Files:**

- Replace: `apps/api/Cargo.toml`
- Regenerate: `apps/api/Cargo.lock`
- Create: `apps/api/rust-toolchain.toml`
- Create: `apps/api/crates/domain/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/application/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/adapter-graphql/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/adapter-postgres/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/adapter-aws-cognito/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/adapter-aws-s3/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/adapter-aws-sqs/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/adapter-aws-dynamodb/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/api-bootstrap/{Cargo.toml,src/lib.rs}`
- Create: `apps/api/crates/api-bootstrap/src/bin/{api.rs,track-point-worker.rs,schema.rs,migrate.rs}`
- Delete: `apps/api/src/`, `apps/api/migration/`, `apps/api/sqs-consumer/`

**Interfaces:** Produces the exact workspace/crate names and dependency direction
defined by the API kernel. No product type or field is produced.

- [ ] Write a failing workspace test that asserts the exact member set, virtual
  root, edition, pinned toolchain, and absence of the three legacy crates.
- [ ] Run `cd apps/api && cargo metadata --locked --all-features`; expect failure
  until the workspace and lockfile exist.
- [ ] Create the virtual workspace and minimal compileable crates with only
  policy-allowed dependencies.
- [ ] Run `cd apps/api && cargo check --workspace --all-targets --all-features`;
  expect success with no warning.
- [ ] Delete the legacy directories and prove `rg -n 'migration|sqs-consumer|name =
  "walking-dog"' apps/api/Cargo.toml` returns no match.

### Task 1.2: Implement bootstrap, empty baseline, and architecture compiler

**Files:**

- Create: `apps/api/crates/api-bootstrap/src/{config.rs,health.rs,observability.rs,shutdown.rs,composition.rs}`
- Create: `apps/api/crates/adapter-postgres/src/{lib.rs,migrations/mod.rs,migrations/m0001_empty_baseline.rs}`
- Create: `apps/api/tools/architecture-validator/{Cargo.toml,src/main.rs,src/policy.rs,src/ast.rs,tests/fixtures.rs}`
- Create: `apps/api/tools/{harness-runtime,integration-test-support,xtask}/Cargo.toml`
- Create: `apps/api/tools/{harness-runtime,integration-test-support}/src/lib.rs`
- Create: `apps/api/tools/xtask/src/{main.rs,architecture.rs,intent.rs}`
- Create: `apps/api/tools/xtask/src/journey_generator.rs`
- Create: `apps/api/tools/xtask/templates/journey/{use_case.rs,contract.rs,graphql.rs,manifest.toml,observability.rs}`
- Create: `apps/api/tools/xtask/tests/journey_generator.rs`
- Create: `apps/api/architecture/{dependency-policy.toml,exceptions.toml}`
- Create: `apps/api/architecture/intents/20260711-api-kernel.toml`
- Create: `apps/api/fixtures/{architecture,observability,providers}/`
- Modify: `infra/sakura/compose.yml`, `.github/workflows/deploy-api.yml`
- Delete: `apps/compose.yml`, `scripts/harness/dev-stack.sh`,
  `scripts/docker-compose-up.sh`

**Interfaces:** Produces `cargo xtask architecture check`, `api`,
`track-point-worker`, `schema`, `migrate`, and `/health`.

- [ ] Add failing positive/negative fixtures for all `API-ARCH-001` through
  `API-ARCH-012`, resolved Cargo edges, exact exceptions, intents, secret logs,
  unknown files, and parser failure.
- [ ] Run `cd apps/api && cargo test -p architecture-validator`; expect failing
  rule IDs before implementation.
- [ ] Implement default-deny graph/AST validation and SARIF/human diagnostics;
  make every fixture assert rule ID and location.
- [ ] Add failing bootstrap tests for missing config, readiness, safe logs,
  graceful shutdown, and twice-applied empty migration; implement the minimum
  typed bootstrap that passes them.
- [ ] Add failing generator tests for collision atomicity, closed registries,
  production/in-memory adapter pairs, contract/GraphQL/observability/manifest
  output, and `verify-generated`; implement `cargo xtask journey new` and
  `cargo xtask journey verify-generated` until they pass.
- [ ] Run `cd apps/api && cargo xtask architecture check`; expect success.
- [ ] Run `cd apps/api && cargo test --workspace --all-targets --all-features`;
  expect all tests pass.
- [ ] Build API/worker images and run `/health`; expect HTTP 200 only after typed
  readiness and no product GraphQL/queue behavior.
- [ ] Record `no affected journey` in the PR evidence: this PR replaces only the
  API architecture/bootstrap kernel, intentionally exposes no product operation,
  and therefore has no user-observable Journey that Maestro can execute.

**PR 1 required result:** API and worker deploy, empty migration applies, every
API architecture negative fixture blocks, and no legacy/API compatibility source
remains. Rollback redeploys the pre-PR API image.

---

## PR 2A — Mobile package, source, and iOS shell replacement

### Task 2A.1: Replace source, package graph, and iOS configuration

**Files:**

- Replace: `apps/mobile/package.json`, `apps/mobile/package-lock.json`,
  `apps/mobile/tsconfig.json`, `apps/mobile/eslint.config.js`,
  `apps/mobile/app.config.ts`, `apps/mobile/jest.setup.ts`
- Create: `apps/mobile/app/{_layout.tsx,index.tsx}`
- Create: `apps/mobile/{features,platform,generated/graphql,design-system,journeys,architecture,tools/mobile-architecture,test-support}/`
- Delete: `apps/mobile/{hooks,stores,components,lib,types,targets}`,
  `apps/mobile/android/`, `apps/mobile/web/`
- Delete obsolete Watch/Web/Android scripts under `apps/mobile/scripts/`
- Modify: `apps/mobile/README.md`, `apps/mobile/CLAUDE.md`

**Interfaces:** Produces an iOS 18.0 shell and removes Zustand, Effect, Graffle,
AsyncStorage domain state, Watch, widgets, Android, and Web dependencies.
The replacement dependency set includes pinned XState, TanStack Query, Expo
SQLite, Expo SecureStore, GraphQL, GraphQL Code Generator plugins, and JSON Schema
validation; it excludes every competing state/transport/persistence runtime.

- [ ] Write a failing package/config test asserting deployment target 18.0,
  allowed scripts/dependencies, and forbidden legacy roots/targets.
- [ ] Replace package/config files and run `cd apps/mobile && npm ci`; expect a
  reproducible install.
- [ ] Build an honest localized shell with no product route and stable
  accessibility identifiers.
- [ ] Run `cd apps/mobile && npm run typecheck && npm run lint && npm run knip`;
  expect success.
- [ ] Run the pinned iOS 18.3 Release-equivalent install/launch smoke; expect the
  development shell and no crash.
- [ ] Record `no affected journey` in the PR evidence: this PR deliberately ships
  only an honest non-product shell, so the Release-equivalent launch smoke is the
  applicable executable evidence and no product Maestro flow is added or claimed.

**PR 2A required result:** The replacement iOS shell builds and launches with the
closed package/source graph. Rollback installs the pre-PR Mobile build. Depends
on PR 1.

---

## PR 2B — Mobile architecture manifest, compiler, and negative gates

### Task 2B.1: Implement manifests, compiler, and boundary policies

**Files:**

- Create: `apps/mobile/architecture/{module.schema.json,dependency-policy.yaml,exceptions.yaml}`
- Create: `apps/mobile/architecture/intents/20260711-mobile-kernel.yaml`
- Create: `apps/mobile/tools/mobile-architecture/src/{cli.ts,discover.ts,graph.ts,exports.ts,manifest.ts,intent.ts,diagnostics.ts}`
- Create: `apps/mobile/tools/mobile-architecture/src/review-input.ts`
- Create: `apps/mobile/tools/mobile-architecture/tests/fixtures/`
- Create: one `module.yaml` and `index.ts` for each eight Feature directory and
  each Platform directory named by the Mobile kernel

**Interfaces:** Produces `npm run architecture`, exact manifest schema, and
closed Feature/Platform ownership; placeholder implementation layers remain
absent.

- [ ] Add failing fixtures for `MOB-ARCH-001` through `MOB-ARCH-014`, aliases,
  re-exports, dynamic imports, type imports, cycles, route leaks, unowned files,
  missing adapter contracts, and privacy violations.
- [ ] Implement the compiler with TypeScript Compiler API and JSON Schema until
  `cd apps/mobile && npm run architecture` passes every fixture.
- [ ] Run `scripts/harness/validate-all.sh`; expect no output and exit 0.

**PR 2B required result:** Every Mobile architecture negative fixture blocks and
the closed module graph passes. Rollback reverts the compiler, manifests, and
policies together. Depends on PR 2A.

---

## PR 2C — Mobile Result, query client, review input, and CI integration

### Task 2C.1: Establish shared platform contracts and required consumers

**Files:**

- Create: `apps/mobile/platform/result/{module.yaml,index.ts,result.ts,mobile-error.ts}`
- Create: `apps/mobile/platform/query/{module.yaml,index.ts,query-client.ts}`
- Create: `apps/mobile/tools/mobile-architecture/src/review-input.ts`
- Modify: `.github/workflows/test-mobile.yml`,
  `scripts/harness/validate-mobile-knip.sh`, `scripts/harness/validate-all.sh`

**Interfaces:** Produces closed Result/error and query-client APIs, deterministic
independent-review input, and required Mobile CI entry points.

- [ ] Add Result/error exhaustiveness and query-client boundary tests; run
  `npm test -- --runInBand`; expect pass.
- [ ] Generate independent-review input highlighting new exports, dependencies,
  fallbacks, optional domain values, mutable module state, locality, seam pairs,
  and production/test interface parity; assert it contains no secret values.
- [ ] Run Mobile tests, typecheck, lint, Knip, architecture, and Harness gates.

**PR 2C required result:** Shared platform contracts and their CI consumers pass
without product behavior. Rollback reverts the platform APIs, review input, and
CI wiring together. Depends on PR 2B.

---

## PR 3A — GraphQL schema generation and Mobile codegen

### Task 3A.1: Establish schema and Mobile code generation

**Files:**

- Create: `apps/api/crates/adapter-graphql/src/{lib.rs,system_query.rs}`
- Modify: `apps/api/crates/api-bootstrap/src/bin/schema.rs`
- Create: `apps/api/schema.graphql`
- Create: `apps/mobile/codegen.ts`
- Create: `apps/mobile/generated/graphql/{schema-types.ts,operations.ts}`
- Create: `apps/mobile/platform/graphql/{module.yaml,index.ts,transport.ts,envelope.ts,scalar-parsers.ts}`
- Create: `apps/mobile/platform/graphql/tests/{transport.contract.test.ts,scalar-parsers.test.ts}`
- Modify: `apps/mobile/package.json`, `apps/mobile/package-lock.json`

**Interfaces:** Produces deterministic local `schema.graphql`, pinned
`typescript`/`typescript-operations`/`typed-document-node`, strict scalar mapping,
and typed standard-fetch transport. Only bootstrap `schemaRevision` exists.

- [ ] Add failing schema determinism, hand-edit, operation-location, strict
  scalar, top-level envelope, and second-generation-clean tests.
- [ ] Generate schema, run Mobile codegen twice, and assert `git diff --exit-code
  -- apps/api/schema.graphql apps/mobile/generated/graphql` succeeds.
- [ ] Run API GraphQL tests and Mobile transport contracts; expect pass.

**PR 3A required result:** Local schema and Mobile generated types are
deterministic and transport contracts pass. Rollback reverts the schema,
codegen, and generated contract together. Depends on PR 2C.

---

## PR 3B — Testcontainers runtime and evidence system

### Task 3B.1: Implement the deterministic Harness foundation

**Files:**

- Create: `apps/api/tools/harness-runtime/src/{runtime.rs,resources.rs,lease.rs,control.rs,auth_provider.rs,clock.rs,faults.rs,evidence.rs,privacy.rs}`
- Create: `apps/api/tools/integration-test-support/src/{environment.rs,fixtures.rs,projections.rs}`
- Create: `apps/api/tools/xtask/src/{harness.rs,journey.rs,evidence.rs}`
- Create: `apps/api/fixtures/providers/cognito/`
- Create: `apps/mobile/journeys/schema.json`
- Create: `apps/mobile/test-support/{environment.ts,simulator.ts,maestro.ts}`
- Create: `.github/workflows/{api-architecture.yml,api-unit.yml,api-integration.yml,graphql-contract.yml,mobile-quality.yml,mobile-ai-review.yml,journey-pr.yml,journey-main.yml,journey-nightly.yml,provider-contract.yml}`
- Delete: `.github/workflows/{test-api.yml,test-mobile.yml,harness.yml}`
- Replace: `docs/runbooks/local-harness.md`, `docs/harness/README.md`

**Interfaces:** Produces `cargo xtask harness verify`, `harness serve/down`,
`journey select/run/run-all`, and `evidence verify` with the exact environment and
evidence manifests in the Harness design.

- [ ] Test two concurrent run namespaces and assert zero shared DB/auth/storage/
  queue/DynamoDB/clock/fault/Simulator/SQLite state.
- [ ] Test every control-plane/Toxiproxy fault reaches its declared seam and no
  control symbol enters production images.
- [ ] Test OTP retrieval redaction and malicious evidence fixtures; expect unsafe
  bundles never upload.
- [ ] Test setup failure, Journey failure, cleanup failure, exporter loss, lease
  recovery, and resource leak produce distinct failed checks.
- [ ] Test the advisory independent Mobile architecture review publishes evidence
  and requires a linked durable human dismissal for P0/P1 findings while never
  replacing deterministic merge gates.
- [ ] Run `cargo xtask harness verify`; expect all container digests/resources,
  iOS 18.3/26.5 shell runs, evidence hashes, and teardown pass without AWS
  credentials.
- [ ] Record `no affected product journey` in the PR evidence: this PR validates
  the Journey runner, Maestro bridge, isolation, failure semantics, and evidence
  pipeline themselves; canonical product flows begin in PR 4 after the first
  complete vertical slice exists.

**PR 3B required result:** One command proves the isolated runtime and evidence
system; required CI is installed and no product Journey is claimed. Rollback
reverts the Harness runtime, evidence system, and workflow replacement together.
Depends on PR 3A.

---

## PR 4 — Access Account vertical slice

### Task 4.1: Identity contract and API

**Files:**

- Create: `apps/api/crates/domain/src/identity/{mod.rs,account.rs,email_address.rs,session.rs,challenge.rs}`
- Create: `apps/api/crates/application/src/identity/{mod.rs,ports.rs,request_code.rs,verify_code.rs,refresh.rs,change_email.rs,sign_out.rs,contracts.rs}`
- Create: `apps/api/crates/adapter-aws-cognito/src/{lib.rs,client.rs,mapping.rs}`
- Create: `apps/api/crates/adapter-postgres/src/identity/{mod.rs,repository.rs,migrations.rs}`
- Create: `apps/api/crates/adapter-graphql/src/identity/{mod.rs,mutation.rs,types.rs}`
- Modify: API composition, migrations, policy/manifests, `apps/api/schema.graphql`

**Produces:** all eight identity mutations, rotating session, shared 401 envelope,
Owner provisioning port, Active-Walk Sign Out guard, and reusable contracts.

- [ ] Write contract tests for every normalized OTP/rate/refresh/revocation/
  idempotency/auth outcome; verify they fail against empty adapters.
- [ ] Implement domain/application, then deterministic and Cognito adapters using
  the same contract suite.
- [ ] Add GraphQL unions and envelope tests; regenerate schema and Mobile output.

### Task 4.2: Account-access Feature and Journey

**Files:**

- Create: `apps/mobile/features/account-access/{module.yaml,index.ts}`
- Create: `apps/mobile/features/account-access/{domain,application,react,ui,adapters/graphql,adapters/secure-storage,tests}/`
- Create: `apps/mobile/platform/secure-storage/{module.yaml,index.ts,expo-secure-store.ts,in-memory.ts,contract.ts}`
- Create: `apps/mobile/app/{sign-in.tsx,sign-up.tsx,verify.tsx,settings/email.tsx,settings/email/verify.tsx}`
- Create: `apps/mobile/app/(tabs)/{_layout.tsx,dogs.tsx,walk.tsx,me.tsx}`
- Create: `docs/harness/journeys/access-account.md`
- Create: `apps/mobile/journeys/access-account/journey.yaml` and the exact
  Access Account fixture/flow pairs in the scenario ledger
- Delete: `docs/harness/journeys/auth-onboarding.md`,
  `apps/mobile/e2e/maestro/auth-onboarding.yaml` after replacement evidence passes

- [ ] Test auth XState transitions, secure storage contract, refresh single-flight,
  one replay, missing tokens, and Active Walk auth recovery port.
- [ ] Implement UI/routes through the public Feature; unavailable tabs remain
  honest shell states.
- [ ] Run `cargo xtask journey run access-account --profile pr`; expect every
  Sign Up/Login/Email Change scenario and privacy comparison passes.

**PR 4 required result:** Access Account is executable end to end on both main
runtimes; all prior foundation checks remain green.

---

## PR 5 — Manage Owner Profile and Preferences vertical slice

### Task 5.1: Owner/media API

**Files:**

- Create: `apps/api/crates/domain/src/owner/{mod.rs,owner.rs,owner_name.rs,avatar.rs}`
- Create: `apps/api/crates/application/src/owner/{mod.rs,ports.rs,current_owner.rs,update_owner.rs,prepare_avatar.rs,contracts.rs}`
- Create: `apps/api/crates/adapter-postgres/src/owner/`
- Implement: `apps/api/crates/adapter-aws-s3/src/`
- Create: `apps/api/crates/adapter-graphql/src/owner/`
- Modify: schema, migrations, manifests, codegen

- [ ] Write failing name, last-write-wins, upload purpose/checksum/expiry,
  replacement/removal/compensation, and read-image contract tests.
- [ ] Implement application/adapters and run production/in-memory shared contracts.

### Task 5.2: Owner-profile/preferences Features and Journey

**Files:**

- Implement: `apps/mobile/features/{owner-profile,preferences}/`
- Implement: `apps/mobile/platform/{media,system-settings}/`
- Create: `apps/mobile/app/{owner/edit.tsx,settings/index.tsx}`
- Create: `docs/harness/journeys/manage-owner-profile-and-preferences.md`
- Create: `apps/mobile/journeys/manage-owner-profile-and-preferences/journey.yaml`
  and its exact fixture/flow pairs in the scenario ledger

- [ ] Write failing form/media/dirty/no-change/settings persistence, notification,
  legal/About, accessibility, language/theme/unit tests.
- [ ] Implement public Features and route composition; run selected Jest/contracts.
- [ ] Run the canonical Journey; expect API/resource/UI values and failure recovery
  compare exactly.

**PR 5 required result:** Owner and Settings outcomes pass; Contribution remains
absent; prior Access Journey passes.

---

## PR 6 — Manage Dogs and Goals vertical slice

### Task 6.1: Dog/Goal API and contract

**Files:**

- Create: `apps/api/crates/domain/src/dog/{mod.rs,dog.rs,dog_name.rs,gender.rs,birthday.rs,walk_goal.rs}`
- Create: `apps/api/crates/application/src/dog/{mod.rs,ports.rs,list.rs,get.rs,create.rs,update.rs,archive.rs,prepare_avatar.rs,contracts.rs}`
- Create: `apps/api/crates/adapter-postgres/src/dog/`
- Create: `apps/api/crates/adapter-graphql/src/dog/`
- Modify: media adapter, schema, migrations, manifests, codegen

- [ ] Write failing tests for exact duplicate semantics, validation, partial
  Birthday, Gender, Goal bounds/default/independence, Archive, Active participant,
  media, and no Breed surface.
- [ ] Implement and run the same application/adapter contracts.

### Task 6.2: Dogs Feature and Journey

**Files:**

- Implement: `apps/mobile/features/dogs/`
- Create: `apps/mobile/app/dogs/{new.tsx,[dogId]/index.tsx,[dogId]/edit.tsx}`
- Create: `docs/harness/journeys/manage-dogs-and-goals.md`
- Create: `apps/mobile/journeys/manage-dogs-and-goals/journey.yaml` and its exact
  fixture/flow pairs in the scenario ledger
- Delete: `docs/harness/journeys/{dog-profile.md,walk-goal.md}` and
  `apps/mobile/e2e/maestro/{dog-profile.yaml,walk-goal.yaml}` after replacement
  evidence passes

- [ ] Write failing list/form/detail/archive/media/age/Goal/error/accessibility tests.
- [ ] Implement Feature mapping and routes without History/Contribution internals.
- [ ] Run the canonical Journey; expect every Dogs source section assigned to this
  slice passes and Breed never appears in schema/UI/evidence.

**PR 6 required result:** Dogs/Goals Journey and all prior Journeys pass.

---

## PR 7 — Record a Walk vertical slice

### Task 7.1: Walk lifecycle, Track Points, worker, and GraphQL

**Files:**

- Create: `apps/api/crates/domain/src/walk/{mod.rs,walk.rs,participant.rs,track_point.rs,metrics.rs}`
- Create: `apps/api/crates/application/src/walk_recording/{mod.rs,ports.rs,start.rs,append_track_points.rs,finish.rs,interrupt.rs,recover.rs,contracts.rs}`
- Create: `apps/api/crates/adapter-postgres/src/walk_recording/`
- Implement: `apps/api/crates/adapter-aws-{sqs,dynamodb}/src/`
- Create: `apps/api/crates/adapter-graphql/src/walk_recording/`
- Modify: worker composition, schema, migrations, manifests, codegen

- [ ] Write failing lifecycle transaction, ownership, one-Active, future-time,
  Track Point batch/order/quality/idempotency, distance/duration, interruption,
  queue retry, and reconciliation contracts.
- [ ] Implement domain/application then Postgres/SQS/DynamoDB/GraphQL/worker
  adapters; run shared contracts and Testcontainers integration.

### Task 7.2: Walk-recording Feature and Journey

**Files:**

- Implement: `apps/mobile/features/walk-recording/`
- Implement: `apps/mobile/platform/{persistence,location,observability}/`
- Replace: `apps/mobile/app/(tabs)/walk.tsx`
- Create: `docs/harness/journeys/record-a-walk.md`
- Create: `apps/mobile/journeys/record-a-walk/journey.yaml` and its exact
  fixture/flow pairs in the scenario ledger
- Delete: `docs/harness/journeys/walk-lifecycle.md`,
  `apps/mobile/e2e/maestro/walk-lifecycle.yaml` after replacement evidence passes

- [ ] Write failing XState transition/model, SQLite contract, permission,
  foreground/background, route quality, restart/reconcile, auth recovery, stable
  map, and interruption tests.
- [ ] Implement without event controls; Finish confirms saved state and returns
  Ready until PR 9 owns real detail navigation.
- [ ] Run the canonical Journey including process kill, permission loss, 30-second
  invalid feed, and API/local mismatch; expect exact hidden Interrupted evidence.

**PR 7 required result:** Record a Walk and all prior Journeys pass; no placeholder
detail or event UI exists.

---

## PR 8 — Capture Walk Events vertical slice

### Task 8.1: Event/media API

**Files:**

- Extend: `apps/api/crates/domain/src/walk/` with Event/Photo values
- Create: `apps/api/crates/application/src/walk_event/{mod.rs,ports.rs,record_pee.rs,record_poop.rs,prepare_photo.rs,record_photo.rs,contracts.rs}`
- Create: `apps/api/crates/adapter-postgres/src/walk_event/`
- Create: `apps/api/crates/adapter-graphql/src/walk_event/`
- Modify: S3 adapter, schema, migrations, manifests, codegen

- [ ] Write failing distinct-tap, participant, boundary, late sync, unknown write,
  media policy/expiry/compensation, idempotency, Completed/Interrupted contracts.
- [ ] Implement and pass production/in-memory adapter contracts.

### Task 8.2: Walk-events Feature and Journey

**Files:**

- Implement: `apps/mobile/features/walk-events/`
- Create: camera route/modal composition under `apps/mobile/app/(tabs)/walk.tsx`
- Create: `docs/harness/journeys/capture-walk-events.md`
- Create: `apps/mobile/journeys/capture-walk-events/journey.yaml` and its exact
  fixture/flow pairs in the scenario ledger
- Delete: `docs/harness/journeys/walk-events-photo.md`,
  `apps/mobile/e2e/maestro/walk-events-photo.yaml` after replacement evidence
  passes

- [ ] Write failing per-Dog tap, durable intent, deep-link-once, Photo normalize/
  upload/pending/retry/discard, post-Finish, unknown-read tests.
- [ ] Implement using only `walk-recording` public `ActiveWalkContext`.
- [ ] Run canonical Journey and verify UI/API/outbox/storage/queue/event evidence.

**PR 8 required result:** Events Journey passes without map remount or Feature
deep import; all prior Journeys pass.

---

## PR 9 — Review Walk History vertical slice

### Task 9.1: History/detail read models and GraphQL

**Files:**

- Create: `apps/api/crates/application/src/walk_insight/{mod.rs,ports.rs,history.rs,detail.rs,contracts.rs}`
- Create: `apps/api/crates/adapter-postgres/src/walk_insight/`
- Create: `apps/api/crates/adapter-graphql/src/walk_insight/`
- Modify: schema, manifests, codegen

- [ ] Write failing Completed-only, fixed-20 cursor, tie order, filter binding,
  Archived/current references, multi-Dog, bad-row isolation, event order/omission,
  pending/broken Photo, Not Found indistinguishability contracts.
- [ ] Implement and pass query-plan/integration tests that prove filtering occurs
  before cursor math and no nested resolver issues queries.

### Task 9.2: Walk-history Feature and Journey

**Files:**

- Implement: `apps/mobile/features/walk-history/`
- Create: `apps/mobile/app/walks/{index.tsx,[walkId].tsx}`
- Modify: Dog Detail and Me route composition, Walk Finish destination
- Create: `docs/harness/journeys/review-walk-history.md`
- Create: `apps/mobile/journeys/review-walk-history/journey.yaml` and its exact
  fixture/flow pairs in the scenario ledger

- [ ] Write failing page/refresh/filter/scroll, unavailable row, units, timeline,
  photo modal, Active redirect, and no-loop tests.
- [ ] Implement public Feature and route composition; replace PR 7 Ready
  confirmation with direct real detail on successful Finish.
- [ ] Run canonical Journey with >20 rows, cursor faults, Archived/renamed Dogs,
  bad metrics/events/media, pending Photo, and Active redirect.

**PR 9 required result:** History Journey and every prior Journey pass.

---

## PR 10 — Review Owner Contribution vertical slice

### Task 10.1: Contribution/progress API read models

**Files:**

- Create: `apps/api/crates/application/src/walk_insight/{owner_contribution.rs,dog_progress.rs}`
- Extend: `apps/api/crates/adapter-postgres/src/walk_insight/`
- Extend: `apps/api/crates/adapter-graphql/src/walk_insight/`
- Modify: schema, manifests, codegen

- [ ] Write failing Completed-only, multi-Dog counting, complete-data, timezone,
  Monday week, startedAt classification, DST/midnight, unrounded seconds, zero vs
  malformed, and Walking Since contracts.
- [ ] Implement authoritative queries and pass query-plan/boundary fixtures.

### Task 10.2: Contribution Feature and Journey

**Files:**

- Implement: `apps/mobile/features/contribution/`
- Modify: `apps/mobile/app/(tabs)/me.tsx`, Dog Detail composition
- Create: `docs/harness/journeys/review-owner-contribution.md`
- Create: `apps/mobile/journeys/review-owner-contribution/journey.yaml` and its
  exact fixture/flow pairs in the scenario ledger
- Delete: `docs/harness/journeys/walk-history-owner-contribution.md`,
  `apps/mobile/e2e/maestro/walk-history-owner-contribution.yaml` after both
  replacement Journeys pass

- [ ] Write failing formatting/unit/locale/weekly graph/no-Walk/large-value/
  unavailable/progress/accessibility tests.
- [ ] Implement using API read models and injected DisplayPreferences only.
- [ ] Run canonical Journey across timezone/unit/language/theme matrices and
  compare unrounded API aggregates with displayed rounded values.

**PR 10 required result:** all seven canonical Journeys pass end to end.

---

## PR 11A — Complete negative gates and the full CI matrix

### Task 11A.1: Complete negative gates and full CI matrix

**Files:**

- Modify: all architecture fixture directories and required workflows
- Modify: `scripts/harness/{validate-all.sh,validate-knowledge.sh,validate-architecture.sh,score-quality.sh}`
- Modify: `docs/harness/{README.md,quality-score.md,lessons-learned.md}`
- Modify: `docs/runbooks/local-harness.md`, `apps/api/README.md`,
  `apps/mobile/README.md`, root `AGENTS.md`
- Create/modify ADRs under `docs/adr/` only for durable questioned decisions

- [ ] Add deletion/negative tests for every PR #366/#367 rule, GraphQL drift,
  evidence privacy, setup/cleanup/leak/exporter failures, and AI-review absence.
- [ ] Run all seven Journeys on iOS 18.3/26.5 and the full nightly pairwise
  accessibility/presentation/fault/timezone matrix; expect zero unexplained retry.
- [ ] Run provider contract separately and record `HUMAN_TIMEOUT` safely when
  applicable; it does not alter deterministic merge status.

**PR 11A required result:** The complete negative-gate and CI matrix is required
and green. Rollback reverts only the new gates and matrix wiring. Depends on all
PR 4–10 vertical slices.

---

## PR 11B — Residue deletion, knowledge promotion, and repository closure

### Task 11B.1: Delete residue and prove repository closure

**Files:**

- Delete: all superseded source, flows, fixtures, schemas, generated types,
  Compose/run scripts, old Journey documents, Watch/Live Activity/Android/Web,
  Breed UI/API, unused dependencies, and expired exceptions identified by
  `git ls-files`, Knip, Cargo metadata, and architecture ownership reports
- Promote final terms/invariants to `CONTEXT.md`, canonical Journeys, ADRs, and
  validators; keep `AGENTS.md` a map

- [ ] Run `rg` checks for every forbidden legacy root/package/symbol and assert no
  match outside migration history documents.
- [ ] Run `cd apps/api && cargo fmt --check && cargo clippy --workspace
  --all-targets --all-features -- -D warnings && cargo test --workspace
  --all-targets --all-features`.
- [ ] Run `cd apps/mobile && npm test -- --runInBand && npm run typecheck && npm
  run lint && npm run knip && npm run architecture && npm run graphql:check`.
- [ ] Run `cargo xtask journey run-all --profile main`, then nightly/release
  profiles; expect every evidence/privacy/hash comparison passes.
- [ ] Run `scripts/harness/validate-all.sh`; expect no output and exit 0.
- [ ] Compare requirement ledger totals: zero unmapped, duplicate-owned,
  contradictory, unverifiable, or placeholder requirements.

**PR 11B required result:** no obsolete asset or exception remains, all required
checks are enforced, seven Journeys satisfy every normalized outcome, and the
input/output audit is ready for human review. Rollback reverts the closure PR as
a whole. Depends on PR 11A.

## Rollback and merge discipline

## Development-process gate boundaries

| Boundary | Responsibility and interface | Acceptance / rollback / dependency |
| --- | --- | --- |
| PR2A | Mobile package/source/iOS shell. Interface: deployable iOS shell. | Shell tests/launch; rollback prior Mobile build; after PR1. |
| PR2B | Mobile manifest/compiler/negative gates. Interface: `npm run architecture`. | Negative fixtures; rollback compiler/policy; after 2A. |
| PR2C | Result/error/query-client/review-input/CI. Interface: Feature-safe platform APIs. | contracts and CI pass; rollback platform layer; after 2B. |
| PR3A | GraphQL schema generation and Mobile codegen. Interface: deterministic schema/types. | twice-generated clean; rollback generated contract; after 2C. |
| PR3B | Testcontainers runtime and evidence system. Interface: deterministic harness. | lifecycle/evidence proof; rollback runtime; after 3A. |
| PR4–10 | Vertical product slices remain unchanged. Interface: complete Journey slices. | each Journey acceptance; revert whole slice; after PR3B. |
| PR11A | Negative gates and full CI matrix. Interface: required validation. | matrix green; rollback gates; after PR4–10. |
| PR11B | Residue/exceptions/knowledge/repository closure. Interface: clean repository. | closure audit; rollback closure PR; after 11A. |

- Merge PRs strictly in numeric order; never cherry-pick a later Feature onto an
  earlier foundation.
- Tag the last green API image and Mobile build for each PR. Rollback selects the
  pair and its empty/development database state; it never mixes schema clients.
- A failed Journey merge is reverted as the whole PR. Do not disable the route,
  optionalize the contract, suppress evidence, or add a compatibility adapter.
- Because there is no production data, destructive schema correction resets the
  development/Harness baseline instead of preserving invalid state.

## Plan completion checks

- Each of 11 PRs has exact owned paths, inputs, produced interfaces, failing-test
  first actions, commands, and required result.
- Every API module, Mobile Feature, GraphQL root area, Harness subsystem, and
  canonical Journey appears in the PR that first needs it.
- Every current top-level workflow/runbook slated for replacement is named.
- The separate audit ticket must validate this plan against every line of PR
  #366, PR #367, all design documents, and every numbered source-spec section
  before review is requested from the user.
