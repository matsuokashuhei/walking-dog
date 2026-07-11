# Next Mobile Architecture Prevention Design

## Status

Approved design. This document defines the ideal architecture and prevention
system for a greenfield successor to `apps/mobile`. It does not preserve source,
runtime, data, or migration compatibility with the current mobile codebase, and
it is not an implementation plan.

## Scope

The design covers:

- the Expo mobile application;
- the GraphQL contracts consumed by Mobile;
- generated Mobile GraphQL operation types;
- journey definitions and their executable harness;
- architecture manifests, validators, and AI-agent review protocols.

It excludes API implementation internals, infrastructure redesign, and migration
from the current Mobile application. The API remains responsible for authoritative
domain decisions and read models that cannot be computed correctly from a bounded
Mobile result page.

## Goals

The successor must make architectural drift difficult even when most changes are
written by AI agents. It must:

- concentrate each domain concept in one owner module;
- expose deep modules through small public interfaces;
- prevent routes and other callers from depending on implementation details;
- keep domain decisions out of platform adapters;
- detect contract and dependency drift deterministically;
- verify changes through the same interface used by production callers;
- connect every product change to an affected journey and product axis;
- retain its protections when the model, agent, or prompt changes.

## Non-goals

- Preserving the current folder structure or public TypeScript types.
- Introducing independently versioned packages for every module.
- Using AI judgment as the sole blocking merge gate.
- Maximizing line or branch coverage as an end in itself.
- Encoding every design preference as an Agent rule.

## Product Frame

Every journey must name its impact on at least one existing product axis:

- Dog experience;
- Data-maximized walks;
- Owner contribution.

The architecture must protect the integrity of walk data and error evidence. A
feature is not complete merely because its successful UI path renders.

## Chosen Approach

Use a modular monolith inside one Expo application, organized as vertical modules
by journey and domain concept. Architecture is enforced primarily as code:
machine-readable manifests, import-graph validation, generated contracts, contract
tests, and journey evidence. AI agents provide design and review judgment where
deterministic checks cannot assess module depth or locality.

This is preferred over:

- a rules-first design, because prose rules become stale and depend on agent
  interpretation;
- package-per-feature isolation, because Metro, Expo, versioning, and coordinated
  changes would add disproportionate operational cost at the initial scale.

A module may become a separate package only after it has a demonstrated need for
independent versioning or deployment.

## Repository Shape

```text
mobile/
├── app/                         # Expo Router composition only
├── features/
│   ├── active-walk/
│   ├── dog-profile/
│   ├── owner-contribution/
│   └── authentication/
├── platform/
│   ├── location/
│   ├── persistence/
│   ├── watch/
│   ├── live-activity/
│   └── observability/
├── generated/
│   └── graphql/
├── design-system/
├── journeys/
└── architecture/
```

There are no root-level, technology-wide `hooks`, `stores`, `components`, or
`lib` directories. Code that changes together lives in the same vertical module.

## Module Model

Each feature module owns:

- its domain model and invariants;
- its application workflow or explicit state machine;
- its React adapter;
- feature-specific UI;
- transport and platform adapters that are private to the module;
- contract tests;
- a `module.yaml` architecture manifest;
- one public entrypoint.

Only the public entrypoint is importable outside the module. Callers cannot deep
import implementation files. A route can compose public feature interfaces and
design-system primitives, but cannot directly import GraphQL transport, storage,
location, Watch, or Live Activity implementations.

Platform modules expose technical capabilities without making domain decisions.
For example, Location reports permission and coordinates. Active Walk decides
whether and how recording proceeds when background permission is unavailable.

## Dependency Direction

The allowed direction is:

```text
app routes
  -> feature public interfaces
    -> feature domain/application implementation
      -> platform interfaces and generated GraphQL contracts
        -> production or in-memory adapters
```

Feature-to-feature access uses another feature's public interface or an explicit
application coordinator. A feature never reads another feature's internal state.
Cycles are forbidden.

## State Ownership

There is no application-wide mutable store.

- Server state belongs to the query client.
- Ephemeral presentation state belongs to the screen that renders it.
- Durable or lifecycle state belongs to its feature module.
- Cross-surface state is exposed as a feature snapshot and changed with explicit
  intents.

Lifecycle-heavy features use explicit state machines. Active Walk, for example,
must represent at least ready, starting, recording, finishing, finished, and failed
states. Valid operations and error recovery are determined by the state machine,
not by ordering several React hooks correctly.

React subscribes to a feature snapshot and sends intents. It does not coordinate
persistence, GPS, uploads, Watch synchronization, or Live Activity updates.

## Interfaces, Seams, and Adapters

The production caller and tests cross the same public feature interface. Tests do
not bypass that interface to reach implementation details.

A new external seam requires two concrete adapters. Typical valid pairs are:

- native production and in-memory harness;
- GraphQL transport and deterministic fixture transport;
- device clock and controlled test clock.

An interface with only one implementation is not introduced speculatively. Private
implementation functions may remain concrete until behavior actually varies.

## GraphQL Contract Design

The checked-in API schema is the source for generated operation documents and
operation-specific TypeScript types. Generated output is transport-only and cannot
be imported by routes or UI.

Each feature adapts generated responses into its domain model and rejects missing
required invariants. It does not preserve parallel aliases such as `avatar` and
`avatarUrl`, or `distance` and `distanceM`, in its domain interface.

Schema generation and operation generation run in CI. Any uncommitted generated
change is a blocking drift failure.

Authoritative aggregates, pagination totals, streaks, and time-window semantics
belong to API read models when a Mobile page cannot contain all required records.
Mobile maps and displays those read models; it does not infer totals from a bounded
page.

## Typed Errors and Recovery

Feature interfaces return typed outcomes. Errors distinguish at least permission
denial, transport failure, degraded native capability, persistence failure,
deferred synchronization, terminal failure, and recoverable failure where those
states are relevant.

User presentation, retry eligibility, and structured observability fields derive
from the same typed outcome. Catch-and-ignore, broad fallback values, and converting
unknown failure into a false success state are forbidden.

## Machine-readable Architecture Manifest

Every feature has a `module.yaml` containing:

- stable module identifier;
- owned domain concepts;
- public entrypoint;
- allowed outgoing module dependencies;
- platform capabilities consumed;
- production and test adapters;
- journeys affected;
- product axes supported;
- contract-test location.

The manifest is not an aspirational catalog. CI compares it with the actual import
graph, public exports, adapters, and test files. Missing or stale declarations fail.

## Knowledge System

Knowledge has a deliberately small set of sources:

- `CONTEXT.md`: domain vocabulary and invariants;
- `docs/journeys/`: user outcomes, failure paths, and evidence requirements;
- `docs/adr/`: durable decisions likely to be questioned again;
- `module.yaml`: machine-readable module ownership and dependencies;
- root `AGENTS.md`: a short map and work protocol only.

Agent rules contain intent that cannot be checked mechanically. Repeated lessons
are promoted in this order:

1. validator;
2. contract test;
3. journey;
4. ADR;
5. Agent rule.

## Prevention Gates

### During editing

- TypeScript, ESLint, and GraphQL generation run continuously.
- Deep imports into feature implementation are errors.
- Route imports from platform or generated code are errors.
- Generated files are read-only.

### Before commit

Only fast, deterministic checks run:

- tests and type checking for touched modules;
- import-graph and cycle validation;
- `module.yaml` versus public-export validation;
- formatting, linting, and secret scanning;
- generated-contract drift validation.

AI review and Maestro do not run in a commit hook.

### On pull requests

- Changed files determine the affected modules.
- Module manifests determine affected journeys.
- Required contract and Maestro tests run.
- Product-axis, successful-path, failure-path, and data evidence are reported.
- A separate AI architecture reviewer evaluates depth, deletion tests, seam
  placement, locality, leverage, and domain leakage.

AI review is advisory. A high-severity finding must be fixed or explicitly
dismissed by a human with a durable reason. AI output alone never changes merge
status.

### On main and nightly

- all journeys run;
- native iOS and extension builds run;
- Watch and Live Activity cross-language fixtures run;
- full dependency, cycle, unused-export, and manifest validation runs;
- flaky tests and gate duration are tracked.

## Testing Strategy

Tests are ordered by interface leverage:

1. domain invariant tests;
2. feature public-interface contract tests;
3. shared contract suites for production and in-memory adapters;
4. GraphQL schema and operation drift tests;
5. UI interaction tests;
6. Maestro journey tests;
7. nightly native integration tests.

Feature tests use in-memory adapters rather than mocking an internal forest of
hooks. SDK mocks are allowed only outside a platform seam. Line coverage is a
diagnostic metric, not a blocking target.

Every pull request declares affected journeys rather than merely touched files.
The journey declaration and `module.yaml` must agree. A product journey cannot be
merged without its required evidence.

## AI-agent Work Protocol

Each agent change follows this sequence:

```text
intent
-> context selection
-> contract change
-> implementation
-> deterministic verification
-> independent AI review
-> evidence
```

Before implementation, the agent declares:

- affected product axis;
- affected journey;
- owner module for each changed domain concept;
- changed public interface;
- existing seam used;
- both adapters if a new seam is proposed;
- success, failure, and recovery contracts.

The agent reads the affected journey, module manifests, relevant domain terms, and
applicable ADRs. It does not load the entire repository knowledge base by default.

An independent review agent does not edit code. It checks:

- whether deletion spreads meaningful complexity to callers;
- whether callers know implementation ordering or error modes;
- whether tests and production callers use the same interface;
- whether domain knowledge leaks across modules;
- whether a proposed seam has two real adapters;
- whether product and journey evidence match the change.

New public exports, dependencies, fallbacks, optional domain fields, and module-
level mutable state are highlighted automatically in pull-request evidence.

## Initial Delivery Sequence

The greenfield system is introduced in this order:

1. architecture manifests and deterministic validators;
2. GraphQL schema and operation generation;
3. design-system and routing shell;
4. Authentication journey;
5. Dog Profile journey;
6. Active Walk journey;
7. Owner Contribution journey.

The first vertical slice is intentionally simpler than Active Walk. It proves the
prevention system before the most lifecycle-heavy module depends on it.

## Acceptance Criteria for the Foundation

The foundation is successful when:

- one representative journey runs through route, feature, transport, and native
  seams;
- production and in-memory adapters pass the same contract suite;
- architecture manifests match the import graph and public exports;
- an intentional deep import causes CI to fail;
- intentional GraphQL drift causes CI to fail;
- deterministic gates preserve the structure when AI review is disabled;
- AI review explains non-mechanical depth and locality risks with file evidence;
- a new feature can be added using public interfaces without reading unrelated
  module implementations.

## Explicitly Deferred

This design does not yet choose exact libraries for state-machine execution,
dependency-graph validation, GraphQL generation, schema validation, or AI review
hosting. Those are implementation-plan decisions and must be evaluated against
Expo compatibility, maintenance cost, execution time, and deterministic behavior.
