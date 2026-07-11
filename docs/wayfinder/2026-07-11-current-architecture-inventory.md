# Current API and Mobile Architecture Inventory

## Purpose

This research resolves the Wayfinder question “Inventory current architecture
gaps and reusable assets.” It compares the current repository with the approved
architecture designs from PR #366 and PR #367. It does not choose replacement
tools or implement the migration.

The evidence baseline is `origin/main` at `08e7e519`, together with the working
tree at `8ef85528`. The two approved inputs are:

- `docs/superpowers/specs/2026-07-11-greenfield-api-architecture-prevention-design.md`
- `docs/superpowers/specs/2026-07-11-next-mobile-architecture-prevention-design.md`

## Executive finding

The repository has useful journey, service-contract, local-infrastructure, and
unit-test assets, but neither target architecture exists yet. The API remains a
single product crate in which GraphQL, SeaORM, AWS clients, configuration, and
application behavior cross boundaries. Mobile remains organized primarily by
technology-wide `app`, `hooks`, `components`, `lib`, and `stores` directories,
with routes importing those details directly.

The current harness detects a small set of known patterns. It does not enforce
the dependency graphs, manifests, generated contracts, exception expiry,
architecture fixtures, or affected-journey evidence required by the two designs.
The migration must therefore establish deterministic architecture kernels before
moving product journeys.

## API inventory

### Current shape

`apps/api/Cargo.toml` defines one `walking-dog` product crate plus the existing
`migration` and `sqs-consumer` workspace members. The product crate publicly
exports `auth`, `entity`, `graphql`, `observability`, `queue`, `service`, and
`util` modules from `apps/api/src/lib.rs`.

There are no target crates for:

- `domain`;
- `application`;
- `adapter-graphql`;
- `adapter-postgres`;
- provider-specific Cognito, S3, SQS, or DynamoDB adapters;
- `api-bootstrap`;
- a repository-owned architecture validator or `xtask` generator.

### Mandatory-boundary gaps

| Target rule | Current evidence | Gap |
| --- | --- | --- |
| Cargo enforces dependency direction | GraphQL, SeaORM, AWS SDKs, application logic, and bootstrap dependencies are declared by the same product crate | Cargo cannot prevent an inner layer from importing an adapter dependency |
| GraphQL is a translation adapter | 16 files under `apps/api/src/graphql` reference SeaORM; resolver/object code queries entities directly | Resolvers and GraphQL objects own persistence access and read-model behavior |
| Provider types stay in provider adapters | GraphQL contains AWS references; service and queue files expose Cognito, S3, SQS, or DynamoDB SDK types | Provider types and construction are not isolated by crates |
| Environment reads occur only in bootstrap | Environment access appears in `graphql`, `auth`, `observability`, `service`, queue, and worker paths | Configuration is read at runtime across the product crate |
| Application interfaces contain no adapter types | `service/error.rs` uses SeaORM error types and service modules accept `DatabaseConnection` or AWS clients | Application-visible contracts are coupled to adapters |
| Production has no `unwrap` or `expect` | Source contains many `unwrap`/`expect` calls; some are tests, while production examples include schema/context access and startup | No AST rule distinguishes and rejects production occurrences |
| Adapter construction occurs only in bootstrap | `apps/api/src/graphql/mod.rs`, `main.rs`, worker binaries, and service constructors build clients or read configuration | Composition is distributed rather than owned by one bootstrap crate |
| Every journey exposes application contracts | Existing service tests cover selected behavior, but there is no journey-module contract suite convention | Authorization, idempotency, rollback, concurrency, clock, error, and log-safety coverage is not systematic |

### Existing deterministic checks

`scripts/harness/validate-architecture.sh` currently checks selected textual
patterns:

- AWS SDK, DynamoDB item shapes, environment access, and selected concrete
  gateway names in GraphQL resolver directories;
- React Navigation imports in Mobile;
- shared API/Mobile walk-goal constants;
- one track-point worker configuration pattern.

These checks are useful promoted lessons, but they are grep-based, do not inspect
the resolved Cargo feature graph or Rust AST, and cover only a subset of PR #366.
There are no passing/failing architecture fixtures with rule identifiers and
source locations. There is also no machine-readable exception registry or expiry
validator.

### Reusable API assets

The following should be treated as behavior and test assets, not copied blindly
as target-layer structure:

- `service::track_point::TrackPointRepository` already expresses the intended
  track-point storage seam.
- `service::storage::StorageGateway` already expresses the intended upload seam.
- `service::auth::AuthGateway` provides a starting seam for Cognito behavior.
- `service::walk` and `service::walk_read_model` already concentrate portions of
  walk lifecycle and aggregate behavior.
- API integration tests cover passwordless authentication, goal boundaries,
  observability, schema behavior, storage, walk lifecycle, and walk read models.
- SeaORM migrations and entity definitions capture the existing relational
  vocabulary and constraints.
- `apps/compose.yml` provides PostgreSQL, DynamoDB Local, MinIO, ElasticMQ, API,
  and worker services suitable for deterministic adapter tests.
- The track-point worker and queue tests contain partial retry, batch, message,
  and repository behavior that can seed future adapter contracts.

### API removal or replacement candidates

These artifacts conflict structurally with the target and should be removed only
after replacement journeys are proven:

- the root `walking-dog` crate as the owner of all product capabilities;
- direct SeaORM imports from `graphql/**`;
- SeaORM and AWS types in application/service public interfaces;
- client construction and environment reads in `graphql`, services, and queue
  modules;
- hand-wired GraphQL context containing database/provider implementation types;
- GraphQL object field resolvers that execute persistence queries;
- grep-only architecture checks once equivalent AST/dependency rules and fixtures
  are active.

`migration` remains a valid adapter/tooling concern. `sqs-consumer` requires a
separate ownership decision: retain it as generic infrastructure only if its
public contract is provider- and domain-neutral; otherwise absorb the behavior
into the SQS adapter or worker composition boundary.

## Mobile inventory

### Current shape

Mobile is an Expo Router application with root-level technology directories:

- `app` for routes;
- `components` for shared and domain-grouped UI;
- `hooks` for queries and workflows;
- `lib` for GraphQL, authentication, storage, walk behavior, platform bridges,
  and utilities;
- `stores` for global Zustand state;
- `types/graphql.ts` for handwritten transport and domain-shaped types.

The baseline contains 22 route TSX files. Fifteen route files directly import
from root `hooks`, `lib`, or `stores`. The repository contains approximately 65
root hook files, 100 component TSX files, 74 `lib` TypeScript/TSX files, and six
store files. These counts include tests and platform variants where applicable;
they are inventory indicators, not quality metrics.

There are no `features/*/module.yaml` manifests, feature public entrypoints,
architecture directory, or `generated/graphql` output.

### Mandatory-boundary gaps

| Target rule | Current evidence | Gap |
| --- | --- | --- |
| Routes compose public feature interfaces only | Routes import hooks, stores, GraphQL-adjacent behavior, and shared implementation modules directly | Route callers know workflow and state implementation details |
| Code that changes together lives in vertical modules | Authentication, dog, user, settings, and walk behavior is spread across routes, components, hooks, lib, stores, and types | Domain concepts lack one owner and one public entrypoint |
| No application-wide mutable store | Zustand stores own auth, settings, and walk lifecycle state | Durable feature state and application coordination are globally reachable |
| Lifecycle-heavy features use explicit state machines | `walk-store.ts` has a three-value phase and many imperative actions; `use-walk-session.ts` sequences API, persistence, tracking, Live Activity, and cleanup | Starting, finishing, failed, recovery, and compensation are implicit across hooks and stores |
| React sends intents rather than orchestrating adapters | Provider and walk hooks coordinate hydration, tracking, Watch, Live Activity, persistence, API mutations, and cleanup | React lifecycle and hook ordering carry domain workflow knowledge |
| Generated operation types are transport-only | Operations are handwritten strings and `types/graphql.ts` contains aliases such as `avatar`/`avatarUrl` and `distance`/`distanceM` | Schema drift and parallel domain vocabulary remain possible |
| Manifests match imports, exports, adapters, journeys, and product axes | No `module.yaml` files or manifest validator exist | Ownership and affected-journey declarations cannot be checked |
| Deep imports, cycles, generated drift, and route/platform imports fail CI | ESLint checks selected syntax/i18n rules and Knip checks unused code | Target dependency rules are not represented as code |
| Tests use the same public interface as production | Jest tests generally exercise components, hooks, stores, and utilities separately | Tests can bypass the feature interface that production routes should use |

### Current GraphQL contract state

The API schema is checked in at `apps/api/schema.graphql`, and at least the walk
query tests parse handwritten documents against it. This is a useful seed for a
schema gate. It is not a generation workflow:

- operation documents are handwritten under `lib/graphql`;
- `types/graphql.ts` is handwritten and mixes transport types, UI aliases, and
  domain-facing types;
- no code-generation command or configuration is present;
- no CI step regenerates schema/operations and rejects a dirty tree;
- generated output is not isolated from route or UI imports.

### Reusable Mobile assets

- Expo Router routes and navigation tests capture the current screen inventory
  and navigation intent.
- Design-system-like primitives under `components/ui` and theme tokens under
  `theme` provide reusable visual behavior, subject to public API cleanup.
- Authentication uses Secure Store rather than AsyncStorage for sensitive
  tokens, with tests around bootstrap, refresh, and storage.
- TanStack Query already provides a server-state owner and query invalidation
  behavior that aligns with PR #367.
- Walk libraries contain reusable algorithms and native adapter behavior for
  distance calculation, GPS tracking, background tasks, persistence, permissions,
  and event outboxes.
- Approximately 120 Jest test files provide behavior examples and regression
  cases for routes, components, hooks, stores, GraphQL, storage, and walk logic.
- Six Maestro flows and six corresponding harness journey documents establish an
  initial journey vocabulary and selector/evidence skeleton.
- ESLint i18n checks, typed-route safeguards, theme tests, and Knip are useful
  deterministic gates to retain inside the new architecture gate set.

### Mobile removal or replacement candidates

- root-level domain workflow hooks, stores, and `lib/walk` ownership;
- route deep imports into implementation details;
- `types/graphql.ts` handwritten transport/domain hybrid types;
- alias-preserving adapters that allow two names for the same domain value;
- global provider bridges that start feature lifecycle orchestration from the
  root layout;
- Watch and Live Activity code, because those capabilities are outside the
  accepted `docs/tmp-testcases/` scope for this migration;
- Knip ignore entries and dependencies retained only for the removed Apple
  extension features.

Shared visual primitives should move to `design-system`; platform-neutral
technical capabilities should move to `platform`; journey-specific UI and
workflow code should move behind feature public entrypoints. Those moves must be
behavior-driven rather than mechanical directory renames.

## Harness, CI, and knowledge inventory

### Reusable assets

- Product principles explicitly define dog experience, data-maximized walks, and
  owner contribution.
- Domain rules cover walk goals, track points, walk lifecycle/read models,
  storage, Cognito email, and legal hosting.
- Six journey documents align with six Maestro skeletons.
- The per-worktree dev stack isolates ports, Compose projects, volumes, and
  evidence paths.
- `validate-all.sh` composes knowledge, architecture, quality, and Mobile Knip
  gates.
- API and Mobile workflows already separate Rust and Jest verification.
- Existing runbooks define API, Mobile, simulator, journey, and evidence commands.

### Missing mandatory gates

- Cargo resolved-dependency allowlist validation;
- Rust AST policies with good/bad fixtures and stable rule identifiers;
- exception registry and expiry enforcement;
- API change-intent manifest and manifest-to-diff validation;
- API journey generator;
- application contract suites shared by in-memory and production adapters;
- deterministic infrastructure contracts for every Postgres/AWS adapter;
- GraphQL schema and Mobile operation generation with dirty-tree drift checks;
- Mobile `module.yaml` schema and manifest-to-import/export/test validation;
- Mobile deep-import, route-to-platform/generated, and cycle validation;
- affected-module to affected-journey selection;
- deterministic seed data, GPS replay, permission control, and camera/photo
  fixtures;
- deterministic local Cognito/JWKS/OTP behavior suitable for required CI;
- cross-layer correlation identifiers and automated sensitive-log inspection;
- standardized evidence manifests and CI artifact publication;
- branch protection requiring all deterministic architecture and journey gates;
- change-intent-driven independent AI architecture review with human disposition;
- a versioned good-change/bad-fixture feedback corpus with false-positive and
  false-negative tracking;
- machine-readable promotion and time-limited exception workflows.

Current GitHub workflows run API tests, Mobile Jest, and repository invariants.
They do not run Mobile lint/typecheck/Knip in the Mobile test workflow, Maestro in
pull requests, architecture fixtures, schema/code generation, or affected-journey
selection.

## Migration constraints exposed by the inventory

1. **Architecture kernels must precede feature migration.** Without the target
   crates, manifests, and validators, migrated code can immediately drift back.
2. **A replacement GraphQL contract must be designed jointly.** The current
   schema, handwritten operations, and handwritten aliases cannot be migrated
   independently without recreating coupling.
3. **Journeys are the safe replacement unit.** A layer-by-layer rewrite would
   leave main deployable but behaviorally incoherent. Each slice needs route,
   feature interface, generated operation, GraphQL adapter, application module,
   adapters, and evidence.
4. **The first slice should be simpler than Active Walk.** Authentication and a
   read-only dog/profile slice can prove both architecture kernels before GPS,
   queues, storage compensation, and background recovery are introduced.
5. **Legacy removal needs explicit gates.** A legacy path may be deleted only
   after its replacement journey passes public-interface contracts and end-to-end
   evidence on main.
6. **Test assets require re-homing, not wholesale deletion.** Existing tests are
   valuable behavior evidence, but target contract tests must enter through the
   same feature/application interfaces used in production.

## Inputs for downstream Wayfinder tickets

The inventory leaves these decisions to their dedicated tickets:

- canonical domain terms and journey/module ownership;
- the concrete Rust workspace, AST validator, manifest, generator, and exception
  formats;
- the concrete Mobile manifest, import validator, state-machine, and generation
  tool choices;
- the replacement GraphQL schema and typed error contract;
- deterministic Cognito/OTP, GPS, permission, media, fixture, observability, and
  CI strategy;
- vertical-slice ordering and final file-level roadmap.

No additional product decision was inferred during this research.
