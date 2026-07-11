# Deterministic Acceptance and Observability Harness

## Purpose

This document defines the single local and CI system that executes every
normalized acceptance outcome without production dependencies. It integrates the
API Testcontainers runtime, replacement GraphQL contract, iOS Mobile application,
Maestro, fixtures, deterministic faults, observability, privacy checks, and
evidence retention.

Inputs:

- `docs/wayfinder/2026-07-11-acceptance-spec-normalization.md`
- `docs/wayfinder/2026-07-11-domain-journey-ownership-map.md`
- API and Mobile architecture-kernel documents
- replacement GraphQL contract and generation workflow
- PR #366, PR #367, and all 13 `docs/tmp-testcases/` inventories

## One runtime, no production dependency

`apps/api/tools/harness-runtime` is the only development and test orchestration
source. `cargo xtask harness serve` starts digest-pinned Testcontainers for:

- PostgreSQL;
- MinIO;
- ElasticMQ;
- DynamoDB Local;
- deterministic authentication/JWKS provider;
- Toxiproxy;
- API and Track Point worker production binaries;
- OpenTelemetry Collector with local trace/log exporters;
- a Harness-only control plane.

The runtime creates typed resource handles, provisions isolated resources, waits
on explicit health/resource conditions, and writes
`.harness-runs/<runId>/environment.json`. Mobile build/run and Maestro consume
that manifest; they do not reconstruct URLs or credentials. Fixed host ports,
fixed sleeps, `apps/compose.yml`, live AWS, production secrets, and production
Cognito are forbidden in required checks.

`cargo xtask harness down <runId>` collects evidence then destroys the run.
Container labels, a renewable lease, process ownership, and a cleanup controller
identify abandoned runs. A new runner reaps an expired run only after capturing
its sanitized diagnostic manifest.

## Run isolation

Every invocation receives a random `runId` and exclusive namespace:

| Resource | Isolation boundary |
| --- | --- |
| PostgreSQL | database/schema and database role |
| MinIO | bucket or bucket prefix with run-only credentials |
| ElasticMQ | queue and dead-letter queue |
| DynamoDB Local | table prefix |
| Authentication | tenant, signing key ID, accounts, challenges, sessions |
| API/worker | run-scoped configuration and telemetry resource attributes |
| Mobile | fresh Simulator clone and erased app container/keychain state |
| SQLite | fresh application container database |
| Clock/faults | run-scoped controller state |

Owner, token, media, queue, database, keychain, SQLite, Simulator app data, and
fault state are never shared between tests. Isolated runs and Journey shards may
execute concurrently. Resource names contain only `runId` and stable fixture ID,
never Email Address, Owner name, or Dog name.

## Fixture system

Each scenario references one versioned declarative fixture:

```text
apps/mobile/journeys/<journey-id>/
├── journey.yaml
└── fixtures/
    ├── success.yaml
    ├── validation.yaml
    └── ...
```

A fixture declares schema version, fixture ID, controlled instant/timezone,
Owner/account state, Dogs and Goals, Walks, Track Points, Events, media facts,
authentication/provider state, expected API/resource/UI projections, fault
manifest, evidence fields, and cleanup expectations. IDs and clocks are stable;
secret values are generated per run and never committed.

The fixture compiler validates closed enums, domain values, references, ordering,
uniqueness, expected calculations, privacy classification, and exact Journey and
Feature ownership. It produces typed Rust setup data, Harness control commands,
Mobile runtime inputs, and expected comparison projections from one source.
Handwritten parallel fixtures are forbidden.

Normal state is seeded through application-level setup interfaces that exercise
the same repositories and invariants as production. Direct database/resource
injection is allowed only for explicitly classified impossible-state fixtures,
such as malformed legacy read data, a future timestamp, cyclic cursor, unknown
stored event, or broken media reference. Such a fixture names the contract rule
it violates and cannot be reused as a success fixture.

Before a scenario, the runner proves the actual starting projection equals the
compiled fixture. After it, the runner compares API, database, queue, storage,
DynamoDB, worker, SQLite, and visible UI outcomes before cleanup. Setup or cleanup
drift fails independently of the Journey assertion.

## Deterministic authentication and OTP

Required local, PR, main, and nightly checks use the production
`adapter-aws-cognito` against a deterministic Cognito-compatible provider
endpoint and JWKS service owned by Harness. The API binary, application port,
adapter mapping, refresh-rotation checks, and error translation are therefore the
same as production; only the external provider is local. It supports:

- Sign In eight-digit and Sign Up/Email Change six-digit challenges;
- ten-minute expiry and 30-second resend availability;
- resend invalidation and one-time consumption;
- five requests per Email Address per controlled hour;
- access and rotating refresh tokens;
- deterministic JWKS/key rotation and invalid signatures;
- global session revocation after Email Address change;
- injected missing access/refresh token provider responses;
- invalid, expired, consumed, wrong-length, rate-limited, and provider-failure
  outcomes.

OTP and challenge values are not fixed in source. The control plane issues a
single-use opaque retrieval handle to the runner, which injects the OTP into the
Maestro process through a masked ephemeral variable. Maestro, shell tracing,
screenshots, video, app/API logs, and evidence never receive the retrieval
response as printable output. The handle and OTP expire with the run.

Real Cognito/SES behavior is a separate explicit or scheduled provider-contract
job. It is not a required merge gate and cannot use production resources. Human
OTP collection waits at most ten minutes and records `HUMAN_TIMEOUT`; it never
hangs or prints the OTP/session/token. Required deterministic success does not
depend on that job.

The endpoint override is typed Harness environment configuration supplied by the
runner, not a fault switch or alternate adapter. Architecture policy rejects a
Harness authentication implementation from the production dependency graph and
contract tests run the same identity suite against the deterministic provider and
the explicitly scheduled real-provider adapter.

## Harness-only failure control

Failure injection exists only in tools and test adapters, never in production
code, images, headers, accounts, Email Addresses, or configuration flags.

The loopback/run-network control plane provides typed, authenticated run-scoped
commands for:

- authentication outcomes and controlled clock;
- fixture projection, malformed contract data, cursor and ordering faults;
- storage upload failure, corrupt/missing/expired media, compensation failure;
- queue delay, duplicate delivery, visibility timeout, worker stop/restart;
- DynamoDB read/write failure and duplicate Track Point identity;
- API/worker termination and restart;
- observability exporter failure and buffer inspection.

Toxiproxy controls latency, timeout, disconnect, bandwidth, and reset between
API, database, MinIO, ElasticMQ, DynamoDB, and authentication provider. The iOS
runner controls foreground/background, process termination, network offline,
location services, location/camera/photo permission, locale, appearance,
Dynamic Type, VoiceOver, Reduce Motion, and timezone.

A deterministic location feed replays normal routes, accuracy over 50 metres,
non-increasing timestamps, speed over 12 m/s, delayed batches, and 30 seconds
without a valid point. Controlled clocks advance OTP, rate-limit, day/week,
timezone, media expiry, and idempotency-retention boundaries without sleeps.

Every scenario declares faults in its fixture. The runner refuses undeclared
fault commands, records activation/deactivation as safe events, and proves the
fault state is empty at teardown. A fault that did not reach the intended seam is
a failed test, not a passing recovery scenario.

## Maestro Journey structure

```text
apps/mobile/e2e/maestro/
├── journeys/
│   ├── access-account/
│   ├── manage-owner-profile-and-preferences/
│   ├── manage-dogs-and-goals/
│   ├── record-a-walk/
│   ├── capture-walk-events/
│   ├── review-walk-history/
│   └── review-owner-contribution/
├── shared/                           # navigation/accessibility primitives only
└── fixtures/                         # generated safe runtime inputs
```

Each Journey directory has a parent flow and independently executable scenarios
classified as `success`, `validation`, `permission`, `transport-recovery`,
`persistence-recovery`, `empty-loading-error`, `accessibility`,
`language-theme-units`, or `privacy-evidence`. Not every Journey invents every
class: the registry declares the classes required by its normalized outcomes.

Shared flows contain mechanics such as launching a clean run or selecting a
stable tab. They cannot contain product assertions, hidden state mutation,
hard-coded accounts, or fallback selectors. Stable accessibility IDs are public
Feature/UI contracts. Text assertions verify localization separately.

The Mobile architecture compiler derives affected Features/capabilities/routes
and compares the selected Journey/scenario set with `journey.yaml`. Changes to
shell, auth transport, navigation, GraphQL, persistence, localization,
design-system, or Walk lifecycle expand selection to every registered consumer.
Unowned diffs and an unjustified empty selection fail.

## Evidence bundle

Every run produces the following before resource cleanup:

```text
.harness-runs/<runId>/evidence/
├── manifest.json
├── journey-result.json
├── graphql.jsonl
├── api-spans.jsonl
├── worker-spans.jsonl
├── mobile-events.jsonl
├── resource-state.json
├── contract-comparison.json
├── maestro/
├── screenshots/
└── privacy-scan.json
```

All records carry `runId`, Journey, scenario, and safe correlation IDs. GraphQL
records operation name, result typename, HTTP/contract code, and duration, not
variables or bodies. API/worker/mobile telemetry uses closed event names and
error codes. Resource state is a safe projection, not raw rows, tokens, object
keys, payloads, or coordinates.

`contract-comparison.json` mechanically compares fixture values, ordered IDs,
pageInfo/cursors, aggregates, database state, queue/storage effects, SQLite
outbox, and UI semantic output. Screenshots and video are human-readable
companions and never the sole data proof.

Redaction occurs at structured event construction, before serialization. Tokens,
OTPs, challenge/session values, Email Addresses, signed URLs, object keys,
idempotency keys, unnecessary personal data, and precise location are prohibited.
Location evidence uses a named synthetic route plus derived counts/distance and
coarse bounding classification only. A final content/entropy/privacy scanner
checks every file, image metadata, filename, and archive; detection fails the run
and prevents artifact upload.

The manifest records SHA-256 for every artifact, schema/fixture/tool versions,
container digests, Git revision, controlled clock/timezone, Xcode, Simulator,
Expo, Maestro, and runtime identifiers. Missing artifacts, hash drift, unknown
files, exporter loss, or privacy-scan omission fail evidence completion.

## iOS support and execution matrix

The replacement Mobile minimum is iOS 18.0. Runtime and device identifiers are
pinned; an Xcode/runtime upgrade is a dedicated change that reruns every Journey.

| Schedule | Matrix |
| --- | --- |
| PR | iPhone 16, iOS 18.3, selected Journeys/scenarios |
| main | iPhone 16/iOS 18.3 and iPhone 17 Pro/iOS 26.5, all seven Journey success and primary failures |
| nightly | small iPhone SE-equivalent/iOS 18.3, iPhone 16/iOS 18.3, iPhone 17 Pro/iOS 26.5; full scenarios and presentation/accessibility matrix |
| release candidate | main matrix plus every normalized scenario and final evidence audit |

Nightly presentation/accessibility dimensions include maximum Dynamic Type,
VoiceOver, Reduce Motion, Japanese/English, Light/Dark, km/mile, and representative
timezones covering UTC, positive, negative, and daylight-saving offsets. Pairwise
covering arrays may reduce redundant combinations, but each individual dimension
and every declared interaction must appear in the generated matrix. The matrix
manifest is committed and drift-checked.

iOS 17 and earlier, iPad, Android, Web, Watch, and Live Activity are not initial
acceptance targets. An iOS 18 API availability check blocks accidental use of a
newer unguarded API even when iOS 26 tests pass.

## CI schedule and sharding

Fast deterministic gates run before simulator allocation. Journey runs use one
isolated Harness namespace and Simulator clone per shard; no shard reuses app or
backend state. The canonical commands are:

```text
cargo xtask harness verify
cargo xtask journey select --intent <intent> --merge-base <sha>
cargo xtask journey run <journey> --scenario <scenario> --device <matrix-id>
cargo xtask journey run-all --profile main
cargo xtask journey run-all --profile nightly
cargo xtask evidence verify <runId>
```

PR selection is a required check. Main runs all seven Journeys with deterministic
success and primary failure scenarios on both supported runtimes. Nightly runs
the complete fault/presentation/accessibility matrix and deterministic flake
repetitions. Provider contracts run in a separate scheduled/explicit workflow.

An automatic retry never turns a failed attempt green. A retry may run only as a
diagnostic follow-up and both attempts remain evidence. Flake rate, p50/p95 gate
duration, setup failures, cleanup failures, resource leaks, and evidence failures
are tracked. A deterministic failure blocks; repeated nondeterminism becomes a
quality issue rather than an allow-failure job.

## Artifact retention

Only bundles that pass privacy scanning may leave the runner:

| Run | Retention |
| --- | --- |
| local success | delete immediately after verification |
| local failure | retain until explicit deletion |
| PR success | 30 days |
| PR failure | 60 days |
| main | 90 days |
| nightly | 30 days |
| release candidate | one year |

If privacy scanning fails, upload is prohibited, CI fails, and the local
quarantine is securely cleaned after emitting only a safe finding summary.
Artifact names contain no product/user values. CI-provider retention matches the
manifest expiry. PR evidence contains the artifact link and manifest hash, not
duplicated screenshots or raw logs.

## Scenario coverage obligations

The Journey registry must cover these cross-cutting normalized outcomes:

- cached-data refresh failure versus first-load failure;
- Not Found indistinguishability versus Retryable transport/provider failure;
- 30-second GraphQL/location and 60-second media timeout;
- mutation double-submit/back blocking and dirty-form discard;
- camera/photo/location permission states and Open Settings recovery;
- token refresh single-flight, rotation, missing token, revocation, and Active
  Walk authentication recovery;
- media normalization, checksum, expiry, compensation, pending retry/discard;
- location quality, permission loss, 30-second invalid-point interruption,
  foreground/background, restart, and API/local reconciliation;
- idempotency same-input replay and different-input conflict;
- fixed history pages, ordering ties, invalid/cyclic cursors, Archived Dog filter,
  and Interrupted exclusion;
- unknown/out-of-bound event omission and privacy-safe violation count;
- timezone/day/week boundaries, partial Birthday age, units, Goal independence,
  and Completed-only aggregates;
- accessibility, localization, appearance, empty/loading/error, large values,
  corrupted read models, and no-secret evidence.

Every source section inherits one canonical Journey owner from the ownership map.
The registry compiler rejects a normalized outcome with no scenario/evidence
mapping or a scenario that claims behavior outside its owning Feature/module.

## Harness exit criteria

The harness design is implemented only when:

- one command starts and tears down the full deterministic runtime without live
  credentials;
- two isolated Journey runs execute concurrently without cross-observation;
- authentication success, expiry, resend, rotation, revocation, and provider
  corruption are deterministic;
- each failure-control family has a fixture proving it reaches the intended seam
  and is absent from production artifacts;
- all seven parent Journeys and scenario registries validate;
- evidence mechanically reconciles UI, API, resources, and observability;
- intentional secret and precise-location fixtures are stopped before upload;
- pinned iOS 18.3 and 26.5 builds install, launch, and execute their scheduled
  matrix;
- intentional setup, Journey, cleanup, resource-leak, and evidence failures each
  fail the correct required check;
- `scripts/harness/validate-all.sh` includes and passes the new validators.

## Self-review

The design was compared in both directions with the 13 source inventories,
normalized outcomes, seven Journey owners, six API modules, eight Mobile
Features, GraphQL contracts, both architecture kernels, product principles,
domain rules, and current Harness architecture.

| Input obligation | Output location |
| --- | --- |
| No live production dependency | single Testcontainers runtime and deterministic auth |
| Reproducible state and complete cleanup | run isolation, declarative fixtures, leases |
| Success/failure/recovery execution | scenario taxonomy and typed fault plane |
| Cognito/OTP semantics without secret evidence | deterministic adapter, masked single-use retrieval, separate provider job |
| Location and native permission behavior | Simulator controls and deterministic feed |
| Every normalized spec executable | scenario coverage obligations and registry compiler |
| API/Mobile/data alignment | contract comparison and correlated telemetry |
| Privacy | pre-serialization redaction, final scanner, upload prohibition |
| PR/main/nightly/release confidence | pinned matrix and schedule |
| Flake visibility | no green retry, duration/flake/resource metrics |
| Evidence durability without indefinite PII | explicit retention policy |

The first comparison found and corrected an authentication-seam error: a
Harness-only identity adapter would have bypassed the production Cognito adapter.
The final design uses the production adapter against a deterministic compatible
provider. No unresolved Harness behavior remains. Actual flow files, fixture schemas,
control APIs, and CI jobs are implementation tasks in the final roadmap.
