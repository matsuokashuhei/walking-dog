# Greenfield API Architecture Prevention Design

## Status

Approved in conversation on 2026-07-11.

## Objective

Design a fail-closed prevention system for rebuilding Walking Dog with Rust,
GraphQL, PostgreSQL, and AWS adapters. The system must prevent known
architecture failures mechanically and use AI agents to discover new failure
patterns that can be promoted into deterministic gates.

This design covers the architecture kernel and prevention system. It does not
refactor the current API or implement the next API.

## Fixed Constraints

- The target is a greenfield codebase; compatibility with the current API
  implementation is not required.
- The stack remains Rust, GraphQL, PostgreSQL, and AWS adapters for Cognito,
  S3, SQS, and DynamoDB.
- Architecture enforcement is fail closed.
- Local hooks provide feedback but are never the root of trust.
- CI required checks and branch protection are the root of trust.
- AI review cannot grant exceptions or be the sole reason a merge is blocked.
- A recurring problem must be promoted into a compiler, AST, contract, or
  journey gate when deterministic detection is possible.

## Chosen Approach

Use a compiler-first architecture, backed by an AST policy validator,
interface contract tests, infrastructure integration tests, journey evidence,
and AI exploration.

Alternatives rejected as the primary mechanism:

- A policy-engine-first design duplicates dependency rules that Cargo can
  enforce and grows into a custom static-analysis platform.
- An agent-governed design is nondeterministic and cannot reliably provide
  fail-closed enforcement.

## Workspace Architecture

The initial workspace is split by dependency capability, not by every domain
module.

```text
api-bootstrap
├── adapter-graphql
├── adapter-postgres
├── adapter-aws-cognito
├── adapter-aws-s3
├── adapter-aws-sqs
├── adapter-aws-dynamodb
└── application
    └── domain
```

Adapters depend on `application` to implement ports. `application` depends on
`domain`. `api-bootstrap` is the only crate that constructs and connects all
adapters.

### `domain`

- Owns values, invariants, and pure state transitions for walks, dogs,
  encounters, and goals.
- Receives time as data rather than reading the current clock.
- Cannot depend on application, GraphQL, SeaORM, AWS SDKs, environment
  variables, HTTP, or filesystems.

### `application`

- Owns deep journey modules such as `StartWalk`, `RecordEncounter`, and
  `TakeWalkPhoto`.
- Owns repository and gateway ports.
- Owns authorization decisions, ordering, idempotency, transaction intent,
  and external-write orchestration.
- Exposes commands, results, and typed errors without GraphQL, SeaORM, or AWS
  provider types.
- Its public interfaces are the primary contract-test surface.

### `adapter-graphql`

- Converts GraphQL inputs into application commands.
- Converts application results and errors into GraphQL outputs.
- Supplies the authenticated actor and request metadata.
- Cannot use SeaORM, AWS SDKs, environment variables, transactions, retries,
  or domain decisions.

### `adapter-postgres`

- Implements application-owned repository and transaction ports using
  SeaORM.
- Contains database constraints, query optimization, and persistence mapping.
- Does not expose SeaORM models outside the crate.

### `adapter-aws-*`

- Each crate contains one provider family and implements application-owned
  ports.
- Translates AWS SDK errors into application-visible failure categories.
- Encapsulates provider retries and wire formats.
- Cannot depend directly on other adapter crates.

### `api-bootstrap`

- Is the only crate permitted to read environment variables.
- Parses and validates typed configuration before starting the runtime.
- Constructs adapters and injects them into application and GraphQL modules.
- Prohibits runtime re-reading of the environment.

### Port Rule

A port is allowed for an external I/O seam or when production behavior has
multiple real adapters. A trait must not be introduced only to create a mock.
Test adapters may implement a port that already exists for a real seam.

## Fail-Closed Gates

All gates are required checks. A failure prevents merge.

### Gate 1: Cargo Dependency Graph

Use `cargo metadata` to compare the resolved dependency graph, including
feature-enabled dependencies, against an explicit allowlist.

Reject:

- `domain` dependencies on application, adapters, or bootstrap.
- `application` dependencies on adapters, `async-graphql`, SeaORM, or AWS SDKs.
- `adapter-graphql` dependencies on SeaORM or AWS SDKs.
- `adapter-postgres` dependencies on GraphQL or AWS SDKs.
- AWS adapters depending on GraphQL, SeaORM, or other adapters.
- Construction of adapters outside `api-bootstrap`.

### Gate 2: Rust AST Architecture Validator

Build a repository-owned validator using `cargo metadata` and `syn`. It must
report the rule identifier, exact source location, and permitted destination.

Initial fail-closed rules:

- `std::env` is allowed only in `api-bootstrap`.
- SeaORM derives, types, and traits are allowed only in `adapter-postgres` and
  migration tooling.
- AWS SDK types are allowed only in the corresponding AWS adapter and
  bootstrap wiring.
- GraphQL derives, `Context`, and `Upload` are allowed only in
  `adapter-graphql`.
- Resolver functions cannot own transactions, retries, clocks, or domain
  decisions.
- Production paths cannot use `unwrap` or `expect`.
- Domain and application public interfaces cannot expose adapter types.
- Application code cannot directly use HTTP, filesystems, environment values,
  or provider clients.

Each rule must have a passing fixture and at least one failing fixture. The
validator test proves the expected rule identifier and source location.

### Gate 3: Application Interface Contracts

Every journey module owns a reusable contract suite covering the applicable
items:

- Actor ownership and authorization.
- State and ordering constraints.
- Idempotency and duplicate requests.
- Transaction rollback.
- Explicit clock boundaries.
- Adapter failure classification.
- Concurrent duplicate requests.
- Absence of tokens, email addresses, precise locations, and private media
  identifiers from errors and logs.

The suite runs against in-memory test adapters and against real infrastructure
adapters where the same semantics apply.

### Gate 4: Infrastructure Integration

Run deterministic local integration tests using Testcontainers or Docker
Compose:

- PostgreSQL constraints, transactions, and concurrency.
- MinIO-compatible S3 storage behavior and failure compensation.
- ElasticMQ-compatible SQS retries and partial batch failures.
- DynamoDB Local batch behavior and idempotency.
- Cognito/JWKS adapter cache, key rotation, provider outage, and duplicate user
  provisioning using a deterministic local provider fixture.

Tests that require a real external provider are isolated from the required
local suite and used only for scheduled or explicitly approved provider
contract verification.

### Gate 5: Journey, Schema, and Observability

- A journey contract exists before a journey module is complete.
- GraphQL schema snapshots reject unapproved changes.
- Journey tests prove GraphQL output and database, queue, or storage state.
- A correlation identifier crosses GraphQL, application, and adapter spans.
- Automated log inspection rejects tokens, email addresses, precise location
  data, and private media identifiers.
- Pull-request metadata identifies the product axis and journey evidence.

## Execution Timing

### Save-Time Agent Hook

- Run `cargo check` for affected crates.
- Run affected AST rules.
- Report a corrective destination for every violation.

### Pre-Commit

- Run format, Clippy, dependency policy, and the full AST validator.
- This hook is feedback only and may not replace CI.

### Pull Request

- Run all crate tests.
- Run all architecture validator fixtures.
- Run infrastructure integration tests.
- Verify schema snapshots and affected journeys.
- Publish evidence as CI artifacts.

### Merge

- Protect the main branch.
- Require every deterministic architecture and journey check.
- Disallow administrator bypass for ordinary development.

## Agent System

### Documentation Routing

Keep root `AGENTS.md` short. It routes agents to:

```text
docs/architecture/dependency-policy.md
docs/architecture/module-design.md
docs/architecture/error-policy.md
docs/architecture/transaction-policy.md
docs/architecture/observability-policy.md
docs/architecture/exception-process.md
docs/harness/domain-rules.md
docs/harness/journeys/
docs/harness/lessons-learned.md
```

The root rules include only reading routes, crate responsibilities, required
commands, non-negotiable prohibitions, and the promotion rule.

### Change Intent Manifest

Before editing product code, an agent creates a machine-readable intent with:

- Product axis.
- Journey.
- Application module.
- Touched seams.
- Expected failure modes.
- Required evidence.

The hook rejects a manifest inconsistent with the proposed crate changes. A
GraphQL change without an application module, for example, is rejected unless
the change is limited to presentation mapping or schema documentation.

### Journey Generator

Provide `cargo xtask new-journey <name>`. It generates:

- Application command, result, and error types.
- Port placement when an external seam is declared.
- GraphQL conversion module.
- Contract-test suite.
- Postgres adapter test skeleton when persistence is declared.
- Journey document.
- Observability fields.
- Architecture manifest entry.

The generator asks which external seams and failure categories exist. It does
not create a port by default.

### PR Architecture Agent

The review agent looks for:

- Shallow modules that fail the deletion test.
- Ordering constraints leaked to callers.
- Transaction leakage.
- Read-then-write races.
- Missing idempotency.
- Hidden clock, environment, and network dependencies.
- Traits introduced only for mocks.
- Optionalization or catch-and-ignore error handling.
- N+1 and unbounded queries.
- Domain vocabulary drift.
- Mismatch between product axis, journey, and evidence.

AI findings do not directly fail CI. High-confidence findings require a human
or independent validation-agent disposition before merge. When deterministic
verification is possible, the finding must be converted into a gate instead
of remaining an AI-only rule.

## Promotion Loop

For every recurring or generalizable finding:

1. Add a minimal reproduction fixture or test.
2. Decide whether a compiler, AST, contract, or journey gate can detect it.
3. Add the deterministic gate when possible.
4. Prove the gate rejects the bad fixture and accepts the good fixture.
5. Otherwise, record the load-bearing decision in an ADR or the contextual
   lesson in `lessons-learned.md`.

A second occurrence of the same class of problem cannot merge without a
validator or test promotion.

## Exceptions

There is no global bypass flag. An exception requires a machine-readable entry
and a matching time-limited ADR containing:

- Rule identifier.
- Exact crate and file scope.
- Owner.
- Expiry date.
- Removal issue.
- Security or reliability reviewer approval.

Glob scopes and indefinite expiry are rejected. Expired entries fail CI.

## Delivery Phases

### Phase 0: Architecture Kernel

Create the workspace crates, dependency policy, AST validator, exception
validator, CI required checks, branch protection, agent routing,
architecture fixtures, and journey generator. Do not implement product
behavior.

Exit criteria:

- Fixtures prove rejection of reverse dependencies, GraphQL-to-SeaORM access,
  application-to-AWS access, environment access outside bootstrap, and expired
  exceptions.
- Disabling local hooks cannot permit merge.

### Phase 1: Walking Skeleton

Implement one vertical journey: an authenticated owner reads one of their
dogs through GraphQL, an application query module, a repository port, and the
PostgreSQL adapter.

Exit criteria:

- The end-to-end query works against PostgreSQL.
- Application contracts prove ownership.
- The resolver contains no domain decision.
- Schema and journey evidence are CI artifacts.
- All forbidden-dependency counts remain zero.

### Phase 2: Representative Journeys

Add journeys in this order:

1. `StartWalk`: transaction, ownership, and multiple dogs.
2. `RecordEncounter`: idempotency, concurrency, and event time.
3. `TakeWalkPhoto`: PostgreSQL, S3, and failure compensation.
4. `RecordTrackPoint`: SQS, DynamoDB, retry, and partial failure.
5. `AuthenticateRequest`: Cognito/JWKS caching, rotation, outage behavior, and
   user provisioning.

Promote every newly discovered general failure class before starting the next
journey.

### Phase 3: Agent Feedback Corpus

- Collect approved good changes and minimal bad fixtures.
- Compare agent findings with expected outcomes.
- Track false positives and false negatives.
- Move deterministic findings into AST or test gates.
- Retain AI-only checks only for design judgments that cannot be mechanically
  proven.

## Success Measures

- Known architecture-violation fixture detection: 100%.
- Known-rule CI escapes: zero.
- Indefinite exceptions: zero.
- GraphQL resolver use of SeaORM or AWS SDKs: zero.
- Provider types in application public interfaces: zero.
- Runtime environment reads outside bootstrap: zero.
- Journey modules with applicable contract suites: 100%.
- Production adapters with deterministic integration coverage: 100%.
- Pull requests with product-axis and journey evidence: 100%.
- Second occurrence of a known problem without gate promotion: zero merges.

## Non-Goals

- Refactoring the current API.
- Building a general-purpose static-analysis platform.
- Creating a crate per domain module at project inception.
- Allowing AI to approve exceptions.
- Blocking merges solely on nondeterministic AI review.
- Reducing architecture health to a single score.
- Requiring live production AWS access in required CI.
