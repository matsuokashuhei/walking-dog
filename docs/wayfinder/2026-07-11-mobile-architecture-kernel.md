# Mobile Architecture Kernel and Fail-Closed Gates

## Purpose

This document adapts the approved Mobile architecture in PR #367 to a
compatibility-breaking replacement of `apps/mobile`. It fixes the module shape,
manifest contract, dependency compiler, state and persistence ownership,
GraphQL generation boundary, testing model, exceptions, and required CI gates.
Product journeys are implemented after this kernel.

Migration cost, diff size, and reuse of the current Mobile source are not design
constraints. Reproducibility, explicit ownership, correctness, diagnosability,
maintainability, and mechanical enforcement take priority.

Inputs:

- PR #367, `Design next-generation Mobile architecture safeguards`
- `docs/wayfinder/2026-07-11-current-architecture-inventory.md`
- `docs/wayfinder/2026-07-11-domain-journey-ownership-map.md`
- `docs/wayfinder/2026-07-11-acceptance-spec-normalization.md`

## Cutover and platform decision

The Mobile Architecture Kernel replaces the current application structure in one
merge. The old routes, screens, root `hooks`, `stores`, `components`, `lib`, and
`types` are removed rather than preserved behind flags or compatibility layers.
The kernel exits with a localized, accessible routing shell that builds, installs,
and launches, but exposes no migrated product journey. Each later journey slice
must restore a usable end-to-end outcome before the next slice begins.

Initial acceptance and required builds are iOS only. Android, Web, Watch, and
Live Activity code, configuration, scripts, dependencies, and speculative ports
are removed. Cross-platform Expo or React Native APIs remain valid when they are
the best iOS implementation. A second platform is added only with an actual use
case and concrete adapter.

There is no device-data migration. The new persistence schema starts empty.
Rollback uses the prior install/build, never a legacy runtime inside the new app.

## Repository layout

```text
apps/mobile/
├── app/                              # Expo Router composition only
├── features/
│   ├── account-access/
│   ├── owner-profile/
│   ├── preferences/
│   ├── dogs/
│   ├── walk-recording/
│   ├── walk-events/
│   ├── walk-history/
│   └── contribution/
├── platform/
│   ├── graphql/
│   ├── query/
│   ├── secure-storage/
│   ├── persistence/
│   ├── location/
│   ├── media/
│   ├── observability/
│   └── system-settings/
├── generated/graphql/               # generated transport code only
├── design-system/                    # tokens and reusable presentation
├── journeys/                         # machine-readable Journey/evidence registry
├── architecture/
│   ├── module.schema.json
│   ├── dependency-policy.yaml
│   ├── exceptions.yaml
│   ├── intents/
│   └── fixtures/
├── tools/mobile-architecture/        # architecture compiler and generators
└── test-support/                     # harness clients and shared test adapters
```

Every feature has the same internal shape:

```text
features/<feature>/
├── module.yaml
├── index.ts                         # the only public entrypoint
├── domain/
├── application/
├── react/
├── ui/
├── adapters/
│   ├── graphql/
│   ├── persistence/
│   └── native/
└── tests/
    ├── contract/
    ├── integration/
    └── fixtures/
```

Directories may be absent when the feature has no corresponding responsibility.
Empty placeholder layers are prohibited. No technology-wide root `hooks`,
`stores`, `components`, `lib`, or `types` directory may be introduced.

`journeys/<journey-id>/journey.yaml` is the Mobile execution registry. It points
to one canonical contract under `docs/harness/journeys/`, the owning Feature
manifests, Maestro flow, fixture identity, success/failure/data evidence, and
privacy classification. It does not duplicate behavioral prose. A registry whose
canonical document, flow, fixture, or owner is missing fails validation.

`app` owns navigation, provider construction, and composition of public Feature
APIs. It contains no GraphQL document, storage query, location operation, domain
decision, or workflow. `design-system` owns presentation primitives only and has
no product concept, transport, persistence, navigation, or Feature dependency.

## Module manifest contract

Every Feature and Platform module owns one `module.yaml`, validated by
`architecture/module.schema.json`. Unknown keys fail. The schema version is
explicit and upgrades are atomic across the repository.

```yaml
schemaVersion: 1
id: walk-recording
kind: feature
concepts: [Active Walk, Track Point, Walk Recording]
publicEntrypoint: index.ts
dependencies:
  features: []
  platform: [graphql, persistence, location, observability]
capabilities:
  provides: [ActiveWalkContext]
  consumes: [AuthenticatedClient, DisplayPreferences]
adapters:
  - port: ActiveWalkRepository
    production: adapters/persistence/sqlite-active-walk-repository.ts
    test: tests/fixtures/in-memory-active-walk-repository.ts
    contract: tests/contract/active-walk-repository.contract.ts
journeys: [record-a-walk]
productAxes:
  primary: walk-data
  considered: [dog-experience, owner-contribution]
errors:
  - permission-denied
  - persistence
  - contract-violation
  - terminal
```

Required fields are schema version, stable ID, kind, owned canonical concepts,
public entrypoint, outgoing dependencies, provided/consumed capabilities,
adapters and shared contracts, canonical journeys, all three product axes, and
declared error categories. Values come from closed registries generated from
`CONTEXT.md`, the ownership map, Journey manifests, and architecture policy.

The compiler compares declarations with actual imports, exports, production and
test adapters, contract locations, changed files, and selected Journey evidence
in both directions. A declaration cannot authorize an unused edge, and an actual
edge cannot exist without a declaration.

## Dependency and public API policy

`architecture/dependency-policy.yaml` is versioned and default-deny. The initial
production direction is:

```text
app routes
  -> Feature public entrypoints + design-system
Feature public entrypoint
  -> that Feature's react/application/domain/UI
Feature implementation
  -> declared Platform public entrypoints + generated GraphQL transport
Platform implementation
  -> native/Expo/React Native/vendor SDKs
```

Rules:

- Feature cycles and Platform cycles are forbidden.
- A Feature may import another Feature only through its `index.ts` and only when
  both manifests declare the edge. Initially only `walk-events ->
  walk-recording`, consuming `ActiveWalkContext`, is allowed.
- Routes may import Feature and Platform composition factories only from public
  entrypoints. Routes cannot import Feature internals, `generated`, native SDKs,
  GraphQL, persistence, location, or media APIs.
- A Feature cannot re-export another Feature, Platform implementation, generated
  GraphQL type, native/vendor type, or private adapter.
- Deep relative paths that escape the current module and aliases targeting a
  module interior are forbidden. Tests obey the same rule except for their own
  module's explicit test surface.
- Domain and application code cannot import React, React Native, Expo Router,
  TanStack Query, XState React bindings, native SDKs, generated GraphQL, or
  concrete adapters.
- `generated/graphql` can be imported only by GraphQL Platform code and a
  Feature's GraphQL adapter. Generated types never enter domain, UI, route, or
  public signatures.
- Platform modules cannot import Features or `app`. `test-support` and compiler
  tools cannot enter a production graph.
- Dynamic import, CommonJS `require`, barrel files other than registered public
  entrypoints, and path aliases that obscure ownership fail unless explicitly
  classified by policy.

## Mobile architecture compiler

`npm run architecture` invokes the repository-owned compiler under
`tools/mobile-architecture`. It uses the TypeScript Compiler API, the resolved
`tsconfig`, package metadata, JSON Schema, and repository registries. ESLint
provides fast editor feedback; the compiler is the CI root of trust.

The compiler discovers all TypeScript/TSX modules, route files, tests, generated
outputs, native entrypoints, package exports, and manifests. Dead or currently
unreachable files are still checked. It resolves aliases, type-only imports,
dynamic imports, re-exports, barrels, and package subpaths. Parse or resolution
failure, an unknown file owner, an unknown module, or an incomplete rule fails.

Initial rules:

| Rule | Fail-closed prohibition |
| --- | --- |
| `MOB-ARCH-001` | Source file without exactly one registered owner |
| `MOB-ARCH-002` | Manifest and actual dependency/export mismatch |
| `MOB-ARCH-003` | Feature or Platform dependency cycle |
| `MOB-ARCH-004` | Feature deep import or import other than public `index.ts` |
| `MOB-ARCH-005` | Route imports anything except registered public composition APIs and design system |
| `MOB-ARCH-006` | React/native/transport/persistence dependency in domain or application |
| `MOB-ARCH-007` | Generated GraphQL type/document outside permitted adapter code |
| `MOB-ARCH-008` | Global mutable store or cross-Feature shared mutable state |
| `MOB-ARCH-009` | Native/vendor type or concrete adapter in a public signature |
| `MOB-ARCH-010` | Port without production adapter, test adapter, and shared contract suite |
| `MOB-ARCH-011` | Undeclared Journey, product axis, concept, capability, or error category |
| `MOB-ARCH-012` | Handwritten GraphQL transport type/document or edited/stale generated output |
| `MOB-ARCH-013` | Secret, OTP, signed URL, storage key, or precise coordinate in logs/evidence |
| `MOB-ARCH-014` | Android, Web, Watch, or Live Activity production target in the iOS-only kernel |

Each rule has passing fixtures and multiple failing fixtures, including aliases,
re-exports, type imports, dynamic imports, and misleading file names where
applicable. Tests assert rule ID and exact location. Output supports concise
human diagnostics and SARIF; there is no warning mode.

## Change intent and agent protocol

Before a product edit, `npm run intent:new -- <id>` creates an immutable manifest
under `architecture/intents/`. It declares the issue, Owner, affected product
axes and Journeys, concept owners, changed public interfaces, existing seams,
both concrete adapters for any new seam, GraphQL/schema impact, durable-state
impact, success/failure/recovery contracts, and expected evidence.

The architecture compiler derives changed modules, concepts, exports,
dependencies, operations, adapters, routes, and Journeys from the merge-base
diff and compares them with the intent in both directions. Unknown values,
multiple intents claiming one product file, unclaimed product files, missing
evidence, and secret-like content fail. Merged intents remain as a compact
change-reason corpus.

Agent work follows `intent -> selected context -> contract -> implementation ->
deterministic verification -> independent review -> evidence`. Selected context
is limited to the affected Journey, manifests, domain terms, and ADRs. A separate
review agent does not edit the change and evaluates depth, deletion impact,
caller knowledge of ordering/error modes, production/test interface parity,
domain leakage, seam legitimacy, locality, and evidence fit. New exports,
dependencies, fallbacks, optional domain values, and module mutable state are
always highlighted in its input.

Independent AI review is advisory because model judgment is nondeterministic. A
P0/P1 finding requires a fix or a human-authored durable dismissal linked from
the intent. AI output alone never changes merge status; deterministic gates stay
effective when AI review is unavailable.

## State and workflow ownership

Zustand and every app-wide mutable store are removed. State has exactly one
owner:

- TanStack Query owns refetchable server cache, never authoritative business
  lifecycle state.
- XState owns multi-stage, failure-sensitive, restorable Feature lifecycles such
  as authentication, Walk recording, and pending media synchronization.
- React local state owns ephemeral state confined to one screen or component.
- SQLite owns durable non-secret device state.
- SecureStore owns authentication secrets only.

XState is not used for simple controls. A lifecycle machine declares states,
events, guards, invoked operations, terminal outcomes, and recovery. React
subscribes to a snapshot and sends typed intents; it does not orchestrate GPS,
persistence, uploads, token refresh, or recovery.

`walk-recording` begins with `ready`, `starting`, `recording`, `finishing`,
`finished`, and `failed`, and may add explicit permission, restoration,
interruption, or authentication-recovery substates demanded by the normalized
specification. Unknown persisted state fails restoration visibly; it never maps
silently to `ready`.

Application and domain boundaries return `Promise<Result<T, MobileError>>` for
expected failure. `MobileError` is a closed tagged union containing permission,
authentication, not-found, validation, contract, transport, timeout,
persistence, deferred-sync, native-capability, terminal, and unexpected
categories. Adapters translate thrown SDK/provider failures at the boundary.
Features decide recovery; UI renders category plus typed recovery action rather
than inspecting strings. Catch-and-ignore, null/zero/default substitution, and
untyped fallbacks are prohibited.

No additional effect runtime is introduced. XState, TanStack Query, React local
state, and the small Result algebra have distinct responsibilities.

## Persistence and synchronization

SecureStore contains tokens and other authentication secrets. SQLite is the
only authoritative device persistence for Active Walk state, Track Points,
Pending Events/Photos, idempotency identities, and synchronization state.
AsyncStorage cannot hold durable domain state. Query cache persistence, if later
justified, remains a disposable presentation optimization.

`platform/persistence` owns SQLite opening, schema, transactions, and migrations.
Features own repository ports and domain mapping; neither SQL nor SQLite types
cross the Platform entrypoint. Every external seam has a production adapter, an
in-memory test adapter, and the same reusable contract suite. New seams are not
created until two concrete adapters exist.

A write that must precede an acknowledged Owner action fails closed. For
example, a Walk cannot enter `recording` before its durable shell is committed,
and an offline event is not accepted until its identity and payload are durable.
Outbox removal occurs only after confirmed idempotent synchronization or an
explicitly confirmed discard required by the acceptance specification.

## GraphQL contract boundary

The new API's generated `schema.graphql` is the only Mobile contract input.
GraphQL Code Generator validates Feature-owned `.graphql` operations and emits
transport documents and types under `generated/graphql`. The Mobile build does
not introspect a remote environment and does not support old schemas.

Feature GraphQL adapters map generated transport values into domain values and
reject missing invariants, invalid enums, invalid ordering, duplicate IDs, and
malformed pagination. Routes, UI, domain, and public APIs never see generated
types. Handwritten GraphQL strings, handwritten response mirrors, compatibility
aliases, parallel old/new operations, unused operations, invalid operations, and
uncommitted generation drift fail CI.

## Tests and Journey selection

Testing follows the highest-leverage interface:

1. pure domain and formatting tests;
2. application use-case and XState model/transition tests;
3. reusable port contract suites against in-memory and production adapters;
4. SQLite, SecureStore wrapper, GraphQL transport, media, and location boundary
   integration tests;
5. route/Feature integration tests using public entrypoints;
6. iOS build-and-launch smoke tests;
7. canonical Maestro Journeys selected from manifests and changed ownership.

Tests do not import private code from another module. Native modules use an
explicit test adapter rather than ambient Jest mocks. Contract suites prove
observable behavior, error classification, cancellation, idempotency, and
concurrency semantics rather than method-call choreography.

The architecture compiler maps every changed Feature, capability, operation,
and route to canonical Journeys. It rejects missing and unjustified evidence.
Broad shell, authentication, navigation, settings, persistence, GraphQL, or
Walk-lifecycle changes select every affected Journey; an unowned product diff
fails instead of defaulting to no Journey.

## Required CI gates

All Mobile changes require, in fail-fast order:

1. `mobile-architecture`: manifests, graph, ownership, exports, fixtures, and
   exceptions;
2. `mobile-graphql-contract`: API schema generation, operation validation,
   codegen, and clean generated diff;
3. `mobile-static`: formatting, TypeScript, ESLint, and Knip;
4. `mobile-unit`: domain, application, Result mapping, and XState tests;
5. `mobile-adapter-contract`: shared contracts against every declared adapter;
6. `mobile-integration`: real local persistence and transport boundaries;
7. `mobile-ios-release`: Release-equivalent Simulator build, install, launch,
   and crash-free routing-shell smoke test;
8. `mobile-journey-selection`: diff-to-Journey completeness;
9. `mobile-maestro`: every selected iOS Journey and sanitized evidence bundle;
10. `mobile-privacy`: deterministic forbidden-data checks over logs and evidence;
11. repository `scripts/harness/validate-all.sh`.

Pull requests also publish the independent AI architecture review and any durable
human dismissals. This report is required evidence but is not itself a
nondeterministic pass/fail gate.

Main and pull requests run all deterministic gates. Nightly validation repeats
the full Journey set and native failure scenarios to detect flakiness and
environment drift. A retry does not convert an initial failure into success;
flaky evidence remains a failure until diagnosed.

## Time-limited exceptions

There is no global bypass. `architecture/exceptions.yaml` follows the API kernel
model: one rule, module, file, symbol, AST fingerprint, Owner, creation date,
expiry, open removal issue, one-to-one ADR, and justification per entry. Globs,
directories, multiple rules, unused entries, fingerprint drift, and unknown
owners fail.

Maximum duration is 30 days. CI warns seven days before expiry and fails on the
expiry date. Extension requires a new ID, ADR, risk review, and approval. No
environment variable, local flag, AI instruction, comment directive, or CLI
switch can bypass a rule. Generated output and tests use explicit classification,
not exceptions.

## Kernel exit criteria

The kernel is complete only when:

- the old source shape and out-of-scope platform code are absent;
- the iOS routing shell builds, installs, launches, localizes, supports Dynamic
  Type/VoiceOver basics, and exposes no product claim it cannot fulfill;
- all eight Feature manifests and all required Platform manifests validate;
- compiler fixtures prove cycles, deep imports, route leaks, invalid exports,
  stale GraphQL, missing adapters/contracts, unowned files, and privacy leaks fail;
- XState, Result, TanStack Query, SQLite, and SecureStore boundaries are encoded
  by policy and representative tests;
- the new API schema generates the empty/initial Mobile contract deterministically;
- every required CI gate is present and required;
- `scripts/harness/validate-all.sh` passes.

The first product slice after the kernel is `account-access`, following PR #367's
sequence. Subsequent slices follow the canonical Journey roadmap, not the old
screen/file order.

The broader PR #367 foundation is complete only after that `account-access`
slice runs one representative Journey through route, public Feature interface,
GraphQL transport, secure native storage, production and in-memory adapters, and
the same contract suite. The kernel intentionally establishes the enforcement
system first; it does not mislabel an empty shell as the representative vertical
slice.

## Self-review against inputs

| Input obligation | Output coverage |
| --- | --- |
| Vertical modular monolith and route-only composition | Repository layout and dependency policy |
| Feature-owned domain, application, React, UI, adapters, tests | Uniform Feature shape without empty placeholders |
| One public entrypoint and no deep imports/cycles | Manifest, graph policy, `MOB-ARCH-003/004/005/009` |
| No app-wide mutable store | State ownership and `MOB-ARCH-008` |
| Explicit lifecycle machines | XState standard and Walk baseline states |
| Generated GraphQL transport only | API-sourced generation and `MOB-ARCH-007/012` |
| Typed recovery-aware failures | Closed Result/Error algebra and adapter translation |
| Manifest matches graph, adapters, contracts, journeys, axes | Schema, bidirectional compiler comparison, rules 002/010/011 |
| Production and test adapters at real seams | Persistence model and shared adapter contracts |
| Editing/PR/main/nightly prevention | ESLint feedback, required CI, and nightly repeat |
| AI-agent work protocol and independent review | Change intent, selected context, deterministic verification, advisory independent review, durable human dismissal |
| PR #367 sequence | Kernel then `account-access`; no legacy coexistence |
| Eight Features and single allowed Feature edge | Ownership-map names and `walk-events -> walk-recording` only |
| iOS-only normalized acceptance | iOS build target; Android/Web/Watch/Live Activity rejected |
| No compatibility or production-data migration | Destructive cutover and empty persistence baseline |
| Normalized durable Walk/event recovery | SQLite authority and fail-closed acknowledgements |
| Mobile `journeys/` plus canonical knowledge sources | Machine registry points to canonical docs, Maestro, fixtures, evidence, and owners without duplicating prose |
| Human-visible, privacy-safe Journey evidence | Journey selection, Maestro, privacy gate |
| Product decision axes | Required manifest fields and compiler registry |

The first comparison found missing Mobile Journey registry, change-intent, and
independent-review details; all three are now covered above. A second comparison
found no uncovered PR #367 or normalized-acceptance architecture obligation.
Screen-level visual design is intentionally not decided here; the
final implementation roadmap must satisfy the repository requirement to present
a visual companion before planning user-facing UI implementation.
