# API Architecture Kernel and Fail-Closed Gates

## Purpose

This document adapts the approved API architecture in PR #366 to an in-place,
compatibility-breaking replacement of `apps/api`. It fixes the workspace,
dependency policy, architecture validator, exceptions, change intents, journey
generator, deterministic harness, and CI root of trust. Product behavior is not
implemented by the kernel.

Migration cost, diff size, and reuse of existing orchestration are not design
constraints. When alternatives differ, choose the one with stronger
reproducibility, isolation, correctness, diagnosability, maintainability, and
mechanical enforcement even when it requires replacing more existing code.

Inputs:

- `docs/superpowers/specs/2026-07-11-greenfield-api-architecture-prevention-design.md`
- `docs/wayfinder/2026-07-11-current-architecture-inventory.md`
- `docs/wayfinder/2026-07-11-domain-journey-ownership-map.md`
- `docs/wayfinder/2026-07-11-acceptance-spec-normalization.md`

## Cutover decision

The Architecture Kernel replaces the current product crate and GraphQL API in
one deployable merge. It does not retain a legacy crate, feature flag, alternate
port, or parallel schema. Existing GraphQL and Mobile compatibility is not a
constraint and there is no production data to migrate.

At kernel exit, `api-bootstrap` supplies typed configuration, observability,
graceful shutdown, and `/health`. The API and track-point-worker binaries build
and start, but expose no product GraphQL behavior and process no product queue
message. Database migrations become a new empty baseline. Docker and deployment
workflows build the new binaries. Rollback uses the previous deployable image,
not a legacy branch in the new runtime.

The following Walking Skeleton adds the first product slice: an authenticated
Owner reads one of their Dogs through GraphQL, an application query, a repository
port, and PostgreSQL.

## Workspace layout

```text
apps/api/
├── Cargo.toml                         # virtual workspace
├── Cargo.lock
├── rust-toolchain.toml                # exact 1.96.0 toolchain and components
├── crates/
│   ├── domain/
│   ├── application/
│   ├── adapter-graphql/
│   ├── adapter-postgres/
│   ├── adapter-aws-cognito/
│   ├── adapter-aws-s3/
│   ├── adapter-aws-sqs/
│   ├── adapter-aws-dynamodb/
│   └── api-bootstrap/
├── tools/
│   ├── architecture-validator/
│   ├── harness-runtime/
│   ├── integration-test-support/
│   └── xtask/
├── architecture/
│   ├── dependency-policy.toml
│   ├── exceptions.toml
│   ├── intents/
│   └── manifests/
└── fixtures/
    ├── architecture/
    ├── observability/
    └── providers/
```

The root package `walking-dog`, standalone `migration`, and standalone
`sqs-consumer` members are removed. SeaORM models and migration definitions live
inside `adapter-postgres`. Generic SQS consumption is internal to
`adapter-aws-sqs`. `api-bootstrap` owns the `api`, `track-point-worker`, `schema`,
and `migrate` binaries and is the only production composition root.

The six application modules live under `application/src/{identity,owner,dog,
walk_recording,walk_event,walk_insight}`. The four domain namespaces live under
`domain/src/{identity,owner,dog,walk}`. No crate-per-use-case split is introduced.

`harness-runtime`, `integration-test-support`, `architecture-validator`, and
`xtask` are tools and cannot enter any production dependency graph. The Rust
toolchain and build/test container images are version- and digest-pinned; an
upgrade changes the policy and runs every validator fixture and contract suite.

## Dependency policy

`architecture/dependency-policy.toml` is versioned, default-deny, and validates
the resolved `cargo metadata --locked --all-features` graph.

```toml
version = 1
default = "deny"

[workspace_edges.normal]
domain = []
application = ["domain"]
adapter-graphql = ["application", "domain"]
adapter-postgres = ["application", "domain"]
adapter-aws-cognito = ["application", "domain"]
adapter-aws-s3 = ["application", "domain"]
adapter-aws-sqs = ["application", "domain"]
adapter-aws-dynamodb = ["application", "domain"]
api-bootstrap = [
  "application",
  "adapter-graphql",
  "adapter-postgres",
  "adapter-aws-cognito",
  "adapter-aws-s3",
  "adapter-aws-sqs",
  "adapter-aws-dynamodb",
]
architecture-validator = []
harness-runtime = []
integration-test-support = ["harness-runtime"]
xtask = ["architecture-validator", "harness-runtime"]

[workspace_edges.dev]
domain = []
application = []
adapter-graphql = ["integration-test-support"]
adapter-postgres = ["integration-test-support"]
adapter-aws-cognito = ["integration-test-support"]
adapter-aws-s3 = ["integration-test-support"]
adapter-aws-sqs = ["integration-test-support"]
adapter-aws-dynamodb = ["integration-test-support"]
api-bootstrap = ["integration-test-support"]
```

Every crate also has an explicit third-party package, feature, dependency-kind,
target, registry, and source allowlist. Examples of permitted capabilities are:

- `domain`: pure value dependencies such as `chrono`, `uuid`, `serde`, and
  `thiserror`;
- `application`: `domain`, async port support, `serde`, `thiserror`, and
  provider-neutral tracing;
- `adapter-graphql`: `async-graphql`, without Axum, SeaORM, or AWS SDKs;
- `adapter-postgres`: SeaORM, PostgreSQL, and migration dependencies;
- each AWS adapter: only its provider-family SDK and mapping dependencies;
- `api-bootstrap`: Axum, Tokio, tracing subscriber, typed configuration, and
  construction-time SDK/config dependencies;
- tools: only their parser, metadata, Testcontainers, CLI, and fixture needs.

Normal, build, dev, target-specific, optional, and feature-activated edges are
checked against their separate allowlists. A dev edge never authorizes the same
edge in a production/build graph. Unknown workspace edges, packages, features,
registries, Git sources, workspace-external paths, and wildcard versions fail.
Application contract suites are public test support within `application`:
application tests run them with in-memory adapters, and adapter integration tests
run the same suite through their existing normal dependency on `application`.
The adapter's dev-only edge to `integration-test-support` supplies containers,
typed endpoints, and fixtures but never adapter construction, avoiding a cycle.

Policy changes require CODEOWNERS approval. Dependency automation cannot add a
package or feature without a corresponding reviewed policy change.

## Architecture validator

`tools/architecture-validator` is a Rust binary using `cargo_metadata`, `syn`,
and repository policy files. `cargo xtask architecture check` is the canonical
entrypoint and performs dependency, AST, exception, intent, and generated-output
validation.

### Source discovery and failure behavior

- Discover every workspace target through Cargo metadata and separately classify
  libraries, binaries, build scripts, tests, examples, and benches.
- Parse every `src/**/*.rs`, including currently unreachable files, so dead code
  is not an escape hatch.
- Exclude only `target/` and policy-declared generated outputs.
- Track `use` trees, rename, glob, `extern crate`, type aliases, and public
  re-exports sufficiently to prevent syntactic hiding of forbidden paths.
- Fail on parse errors, unknown crates/files/targets, invalid policy, unused
  exceptions, and rules that cannot complete.
- Do not claim semantic coverage that `syn` cannot provide; assign those cases to
  the Cargo graph, compiler/Clippy, or contract tests.

### Initial rules

| Rule | Fail-closed prohibition |
| --- | --- |
| `API-ARCH-001` | Process environment access outside `api-bootstrap` |
| `API-ARCH-002` | SeaORM outside `adapter-postgres` and classified migration targets |
| `API-ARCH-003` | AWS SDK outside the corresponding adapter and bootstrap wiring |
| `API-ARCH-004` | GraphQL derives, Context, or Upload outside `adapter-graphql` |
| `API-ARCH-005` | `unwrap`, `expect`, `panic!`, `todo!`, or `unimplemented!` in production targets |
| `API-ARCH-006` | Adapter types in domain/application public signatures, aliases, or re-exports |
| `API-ARCH-007` | HTTP, filesystem, environment, or provider clients in domain/application |
| `API-ARCH-008` | Transactions, retries, clocks, repositories, storage, or providers in resolvers |
| `API-ARCH-009` | Adapter construction outside `api-bootstrap` |
| `API-ARCH-010` | Direct imports between the six application modules |
| `API-ARCH-011` | Raw SQL outside classified `adapter-postgres` query/migration modules |
| `API-ARCH-012` | Direct logging of tokens, OTP, Email Address, coordinates, or storage keys |

Every rule has passing fixtures and multiple failing fixtures, including alias
and re-export cases where relevant. Fixture tests assert rule ID and exact source
location. Validator output includes rule ID, repository-relative location,
symbol, permitted destination, and corrective guidance. Human-readable and SARIF
formats are required; there is no warning mode. Validator unit tests and golden
SARIF tests are part of the Architecture required check.

## Time-limited exceptions

There is no global bypass. `architecture/exceptions.toml` entries use the
following shape:

```toml
version = 1

[[exception]]
id = "API-EXC-0001"
rule = "API-ARCH-008"
crate = "adapter-graphql"
file = "crates/adapter-graphql/src/walk/query.rs"
symbol = "WalkQuery::legacy_projection"
fingerprint = "sha256:<validator-generated-ast-fingerprint>"
owner = "github:matsuokashuhei"
created_on = "2026-07-11"
expires_on = "2026-08-10"
removal_issue = "https://github.com/matsuokashuhei/walking-dog/issues/..."
adr = "docs/adr/....md"
justification = "..."
```

The maximum duration is 30 days. Exact crate, file, symbol, rule, AST
fingerprint, valid Owner, open removal issue, and one-to-one ADR are mandatory.
Globs, directories, multiple rules, indefinite/expired dates, missing targets,
unused entries, and fingerprint drift fail CI. The removal issue must target a
milestone before expiry. CI annotates seven days before expiry and fails on the
expiry date.

The entry and ADR require security/reliability CODEOWNERS approval. Extension
requires a new ID, ADR, risk review, and approval. AI, environment variables,
local flags, and CLI switches cannot create or extend exceptions. Fixtures,
generated output, tests, and migration tooling use explicit target policy rather
than exceptions.

## Change Intent Manifest

Before product editing, `cargo xtask intent new <id>` creates an immutable audit
record under `architecture/intents/<YYYYMMDD>-<slug>.toml`.

Required fields are version, unique ID, title, change kind, Owner, issue, product
axes, canonical journeys, application modules, touched seams, schema impact,
data-migration impact, expected failure modes, and required evidence. Values are
closed registries. Schema impact is `none`, `compatible`, or `breaking`.

CI derives actual changed crates, adapters, schema, migrations, and files from
the merge base and compares declaration and diff in both directions. Every
product file belongs to exactly one intent. Adapter changes require their seam
and integration evidence. Application changes name one of the six modules.
GraphQL-only work may omit an application module only for a justified
`presentation` change. Architecture/tool/docs changes use `architecture` and do
not invent a product journey. Required evidence names must resolve to successful
CI artifacts.

Unknown or empty values, duplicate IDs, overlapping ownership, missing artifacts,
and secret-like values fail. Save-time feedback rejects the first product edit
without an intent, while CI remains the root of trust for final diff consistency.
Merged manifests remain as the agent feedback and change-reason corpus.

## Journey generator

`cargo xtask journey new <use-case>` creates one application use case associated
with a canonical Owner journey and application module. It accepts interactive
input or a reproducible `--spec <toml>` form. Inputs include command/query kind,
GraphQL field contract, real external seams, and expected failure categories.
It never creates a port solely for a mock.

Generated outputs include:

- application command/query, result, typed error, handler, and reusable contract
  suite;
- GraphQL conversion module;
- selected adapter contract/integration skeletons;
- canonical journey document creation or manifested use-case update;
- observability field and forbidden-data fixtures;
- architecture manifest with generator version and generated file ownership.

Generation happens in a temporary directory, validates the complete result, and
atomically places files only when formatting, architecture checks, and generated
fixtures pass. Existing-file collisions leave the workspace unchanged. Generated
files may be edited, but deleting required markers, contracts, ownership, or
manifest data fails `cargo xtask journey verify-generated`.

## Single Testcontainers harness

Testcontainers is the only development and test service-orchestration source of
truth. `apps/compose.yml` and `scripts/harness/dev-stack.sh` are removed when the
kernel migration completes. `infra/sakura/compose.yml` remains a production
deployment artifact and is never a test topology source.

`tools/harness-runtime` defines digest-pinned PostgreSQL, MinIO, ElasticMQ,
DynamoDB Local, deterministic Cognito/JWKS fixture, API, and worker containers.
It owns typed wait strategies, resource provisioning, seed data, random ports,
run identity, leases, cleanup, log collection, and typed connection manifests.
`tools/integration-test-support` exposes service handles, typed endpoints,
resource fixtures, and failure controls without constructing production adapters
or leaking container control into contract suites. Each adapter integration test
constructs its own adapter from those typed inputs.

Adapter integration tests instantiate `harness-runtime` directly and start only
required services. GraphQL journeys use the same runtime. Mobile and Maestro use
`cargo xtask harness serve`, a resident runner that keeps containers alive and
writes `.harness-runs/<run-id>/environment.json`; app builds read the API URL
from that manifest. `cargo xtask harness down <run-id>` or runner shutdown cleans
all resources. Labels and leases detect and reclaim stale runners and containers.

Every suite uses isolated database/schema, bucket prefix, queue, and DynamoDB
namespace. Image digests, typed initialization, health/resource wait conditions,
and sanitized evidence collection are identical locally and in CI. Fixed sleeps
are forbidden. Failure bundles correlate container logs, API spans, resource
state, and test results by run ID before cleanup. Testcontainers dependencies are
tools-only and are rejected from every production graph by policy.

Required CI never calls live AWS. Provider-specific behavior that deterministic
fixtures cannot prove runs in a separate scheduled/explicit provider-contract
workflow against dedicated non-production resources. Its evidence may discover
adapter drift but cannot weaken or replace the required local contracts.

## Required CI checks

Five stable checks run for pull requests, pushes to main, and merge queue events:

1. `API / Architecture`
   - format, all-target/all-feature Clippy with warnings denied, dependency
     policy, every AST rule/fixture, exception, intent, and generated drift;
2. `API / Domain and Application Contracts`
   - domain/property tests and all module contracts using in-memory adapters;
3. `API / Adapter Integration`
   - every production adapter contract and emulator-specific failure,
     concurrency, retry, partial-failure, and compensation test;
4. `API / GraphQL Schema and Journeys`
   - GraphQL adapter, schema artifact comparison, intent-selected journeys,
     downstream state assertions, correlation, and log-safety evidence;
5. `Repository / Harness Invariants`
   - repository validators, PR metadata consistency, harness tests, and
     validator self-tests.

During kernel cutover, `scripts/harness/validate-all.sh` is updated atomically to
delegate API architecture checks to `cargo xtask architecture check`; it must not
retain references to removed `service/*`, Compose, or the legacy grep validator.
Repository-level knowledge, quality, and Mobile checks remain composed through
the same top-level command.

Workflows create stable check names on every PR; non-API changes explicitly pass
no-op jobs after change detection rather than skipping the workflow. Main branch
protection requires all five, fresh base, stale approval dismissal, and no
ordinary administrator bypass. Architecture policy, validators, workflows, and
exception files require CODEOWNERS review.

Local save feedback runs affected `cargo check`, affected AST rules, and intent
presence. Pre-commit runs format, full Clippy, dependency/AST/exception/intent
checks, and affected contracts. Hooks are never the root of trust.

Service images are digest-pinned, waits use health/resource conditions, timeouts
fail, and caches key on lockfile/toolchain/target without caching test outcomes.
SARIF, schema, journey evidence, and sanitized failure logs are uploaded even on
failure.

## Policy documentation and promotion

Root `AGENTS.md` remains a router. Kernel delivery creates the PR #366 policy
documents for dependency, module, error, transaction, observability, and
exception rules under `docs/architecture/`, and routes to domain rules, journeys,
lessons, and the local Testcontainers runbook.

A recurring or generalizable review finding must receive a minimal fixture and
be classified for compiler, AST, contract, integration, or journey enforcement.
The second occurrence cannot merge without deterministic promotion. Findings
that cannot be deterministic become a load-bearing ADR or contextual lesson;
AI never grants exceptions or blocks merge as the sole evidence.

High-confidence AI findings require a human or independent validation-agent
disposition. Accepted deterministic findings are promoted before the next
representative use case; design-only findings are recorded as ADRs or lessons.

## Permanent success invariants

- Known architecture-violation fixture detection is 100% and known-rule CI
  escapes are zero.
- Indefinite, expired, unused, or silently broadened exceptions are zero.
- GraphQL resolver use of SeaORM/AWS, provider types in application interfaces,
  and environment reads outside bootstrap are zero.
- Applicable application use cases with reusable contracts and production
  adapters with deterministic integration coverage remain 100%.
- Product changes with matching product-axis, canonical-journey, and evidence
  manifests remain 100%.
- A second occurrence of a known general failure without deterministic promotion
  has zero permitted merges.

## Kernel exit criteria

- The virtual workspace and production dependency graph match the default-deny
  policy.
- All twelve initial architecture rules have passing and failing fixtures.
- Alias, public re-export, unreachable-file, parse-error, invalid-policy, and
  expired/unused-exception fixtures fail with exact rule evidence.
- Intent/diff and generated-journey fixtures prove both acceptance and rejection.
- Testcontainers starts each isolated service and the full resident Harness,
  emits a typed connection manifest, captures sanitized failure evidence, and
  cleans normal/stale resources.
- API, worker, schema, and migration binaries build from `api-bootstrap`; API and
  worker start, report health/readiness, and shut down gracefully.
- The new empty database baseline applies from scratch.
- All five stable required checks pass and remain required when local hooks are
  disabled.
- The old product crate, GraphQL schema, migration crate, SQS consumer crate,
  development Compose topology, and legacy boundary shell validator are absent.
- No product journey is claimed complete until the Walking Skeleton that follows
  the kernel.

## Self-review traceability

| PR #366 input | Resolution in this document |
| --- | --- |
| Objective, fixed constraints, chosen approach | Purpose, cutover, default-deny policy, CI root of trust |
| Workspace Architecture and Port Rule | Workspace layout, dependency policy, application contracts |
| Gate 1: Cargo graph | Dependency policy including normal/dev/feature/target edges |
| Gate 2: Rust AST | Twelve rules, source discovery, aliases, fixtures, SARIF |
| Gate 3: Application contracts | Generator output and Domain/Application required check |
| Gate 4: Infrastructure integration | Single Testcontainers harness and scheduled provider contracts |
| Gate 5: Journey/schema/observability | GraphQL/Journey required check, intents, evidence, log safety |
| Save-time, pre-commit, PR, merge timing | Required CI checks and local feedback |
| Documentation routing | Policy documentation and runbook routing |
| Change Intent Manifest | Versioned retained intent schema and diff validation |
| Journey Generator | Atomic generator and generated-drift verification |
| PR Architecture Agent and promotion loop | Human/independent disposition and deterministic promotion |
| Exceptions | Fingerprinted 30-day maximum entries and one-to-one ADRs |
| Delivery phases | Kernel cutover, Walking Skeleton handoff, kernel exit criteria |
| Success measures and non-goals | Permanent success invariants and removal of legacy/AI bypasses |

The review also compared the current inventory gaps: single-crate capability
leakage, resolver persistence access, provider types, distributed environment
reads, missing compiler/AST gates, missing contracts/integration coverage, and
shell-only validation all receive explicit kernel destinations. No input is
answered by preserving the old architecture merely because it already exists.
