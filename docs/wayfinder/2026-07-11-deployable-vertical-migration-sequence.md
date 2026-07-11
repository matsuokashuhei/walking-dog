# Deployable Vertical Migration Sequence

## Purpose

This document fixes the dependency order and atomic pull-request boundaries for
replacing `apps/api` and `apps/mobile`. It is the structural input to the later
file-level implementation roadmap. It does not preserve the current API, Mobile,
runtime, local device data, or production data.

The sequence prioritizes whole-system consistency and quality over diff size or
reuse. Foundation merges may temporarily expose no product Journey. Once a
Journey is declared migrated, it remains executable end to end in every later
merge.

Inputs:

- API architecture kernel and PR #366
- Mobile architecture kernel and PR #367
- replacement GraphQL contract
- deterministic acceptance/observability Harness
- canonical domain/Journey ownership map
- normalized acceptance specification
- approved visual artifact:
  `docs/wayfinder/artifacts/2026-07-11-mobile-journey-wireflow.html`

The visual artifact was reviewed and approved on 2026-07-11. It validates the
three-tab shell, route/Feature/Journey ownership, lifecycle overrides, common
states, and delivery-slice placement. It is structural, not final visual design.

## Atomic merge policy

The migration uses eleven sequential pull requests. Each is one reviewable,
deployable unit. Journey pull requests are vertical: contract, API, GraphQL,
Mobile, Harness, observability, and evidence merge together. They are never split
into API-only, Mobile-only, or test-later pull requests.

Within a pull request, commits follow:

```text
contract/negative fixture
-> API/domain/application/adapters
-> schema and generated Mobile transport
-> Mobile public Feature and route composition
-> Journey fixture/Maestro/observability
-> deletion and full verification
```

Every commit passes format, architecture, generation, and type/build gates. The
route remains unreachable until its complete Journey commit. The pull request
merges only when its exit criteria pass; there are no follow-up TODOs, warning
gates, temporary compatibility adapters, dual schemas, feature flags, or
indefinite exceptions.

Rollback always deploys the previous complete API image and Mobile build as a
pair. It does not reactivate legacy code inside the new binaries. Database/device
data migration and forward compatibility are unnecessary because there is no
production data and the replacement Mobile starts with an empty device schema.

## Dependency graph

```text
PR 1 API Kernel
  -> PR 2 Mobile Kernel
    -> PR 3 Contract + Harness Foundation
      -> PR 4 Access Account
        -> PR 5 Owner Profile + Preferences
          -> PR 6 Dogs + Goals
            -> PR 7 Record a Walk
              -> PR 8 Capture Walk Events
                -> PR 9 Review Walk History
                  -> PR 10 Review Owner Contribution
                    -> PR 11 Integrated Hardening
```

History depends on Events so its detail/timeline/media contract is complete when
first exposed. Contribution follows History so the Completed-only projections,
filtering, ordering, and bad-data policy are already proven. This is intentionally
more sequential than parallel feature construction: it prevents callers from
depending on incomplete read models or speculative seams.

## PR 1 — Replace the API with the architecture kernel

### Outcome

Remove the current product crate and establish the virtual Rust workspace,
default-deny dependency/AST compiler, typed bootstrap, empty database baseline,
production API/worker binaries, `/health`, structured observability, graceful
shutdown, Testcontainers tool crates, intents, exact exceptions, and generator
fixtures. No product GraphQL field, queue message, or migration is retained.

### Ownership and surfaces

- Creates `domain`, `application`, all declared adapter crates, `api-bootstrap`,
  architecture tools, Harness tools, and `xtask` with no speculative product
  implementation.
- Removes the current root product crate, standalone migration/consumer crates,
  development Compose topology, and legacy migrations.
- Keeps production Sakura Compose as deployment-only configuration pointing at
  the replacement images.

### Deployable state

The API and worker build and start. `/health` reports process/config readiness;
the worker processes no product message. Database migration creates the new empty
baseline. Mobile is temporarily incompatible and is not a supported Journey.

### Exit criteria

- all API architecture rules and positive/negative fixtures pass;
- `cargo metadata --locked --all-features` matches default-deny policy;
- API/worker/schema/migrate binaries build from pinned toolchain/container;
- empty migration applies twice safely to isolated PostgreSQL;
- `/health`, startup failure, shutdown, and forbidden-log fixtures pass;
- Docker/deployment build uses only new binaries;
- legacy API source, migration history, dev Compose, and compatibility schema are
  absent;
- repository Harness validation passes.

## PR 2 — Replace Mobile with the architecture kernel

### Outcome

Remove the current Expo source and introduce the iOS-only vertical modular
monolith, module manifests, architecture compiler, intent protocol, Journey
registry, design-system boundary, route-only composition shell, error Result
algebra, XState/TanStack/SQLite/SecureStore policies, and Release-build gates.

### Ownership and surfaces

- Creates manifests for the eight Features and required Platform modules without
  empty implementation layers.
- Creates the localized accessible routing shell; product routes remain absent.
- Removes root hooks/stores/components/lib/types, Zustand, handwritten GraphQL,
  Android/Web/Watch/Live Activity code and config, and the old device schema.
- Sets minimum iOS 18.0 and pinned simulator matrix policy.

### Deployable state

The iOS app builds, installs, and launches to an honest development shell. It
does not claim authentication, Dog, Walk, History, or Contribution availability.
The API remains health-only.

### Exit criteria

- all Mobile architecture fixtures fail/pass under their stable rule IDs;
- every source file has exactly one manifest owner and the dependency graph is
  acyclic;
- route imports, deep imports, generated access, global mutable state, missing
  adapter contracts, and out-of-scope targets are mechanically rejected;
- iOS 18.3 Release-equivalent build installs and launches without crash;
- localization, Dynamic Type, VoiceOver naming, and reduced-motion shell smoke
  tests pass;
- old Mobile source, dependencies, native targets, and device data are absent;
- repository Harness validation passes.

## PR 3 — Establish the shared contract and deterministic Harness

### Outcome

Integrate local schema generation, Feature-owned operation discovery, pinned
Mobile codegen, deterministic Cognito-compatible provider, PostgreSQL/MinIO/
ElasticMQ/DynamoDB Local/Toxiproxy/OTel runtime, run isolation, fixture compiler,
failure control, iOS runner, evidence bundle, privacy scanner, and Journey
selection. The system still exposes no product Journey.

### Ownership and surfaces

- API schema contains only a bootstrap-owned system/schema-revision query needed
  to prove deterministic generation; no product aggregate exists.
- Mobile generates transport output from the local schema but owns no product
  operation.
- Harness proves production binaries/adapters against deterministic external
  services; it contains all fault controls outside production graphs.

### Deployable state

API health/system schema and Mobile development shell work against one Harness
environment manifest. One command starts, verifies, and tears down the isolated
stack. The shell does not expose a product route.

### Exit criteria

- schema generation and Mobile generation are deterministic with a clean second
  pass;
- two concurrent isolated runs cannot observe each other's database, auth,
  storage, queue, DynamoDB, clock, faults, Simulator, keychain, or SQLite state;
- each failure-control family proves it reaches its intended seam;
- intentional token/OTP/signed-URL/object-key/coordinate evidence is blocked
  before upload;
- setup, cleanup, lease recovery, resource leak, and exporter failure each fail
  the correct gate;
- pinned iOS 18.3 and 26.5 shell runs produce valid evidence bundles;
- every required foundation CI check is enforced.

## PR 4 — Migrate Access Account

### Outcome

Deliver Sign In, Sign Up, OTP verification, token refresh rotation, Email Address
change, global session revocation, Sign Out, legal links, session persistence, and
authenticated entry into the Dogs/Walk/Me shell.

### API and contract

- Implements `identity`, its Cognito ports/adapters, idempotency, Owner
  provisioning port, 401 envelope, and secret-safe telemetry.
- Adds all identity mutations and typed outcomes from the replacement GraphQL
  contract. Both access and refresh tokens are mandatory.
- Creates the minimum Owner record required for account ownership, without Owner
  profile-edit or contribution queries.

### Mobile and Journey

- Implements `account-access`, AuthenticatedClient capability, SecureStore
  adapter plus in-memory adapter/contract, and auth XState machines.
- Publishes authenticated tabs whose unavailable product destinations remain
  honest shell states until their slices migrate.
- Promotes `Access Account` Journey and all Sign Up/Login/Email Change source
  sections into deterministic scenarios.

### Exit criteria

- eight/six-digit OTP, ten-minute expiry, 30-second resend, invalidation,
  consumption, five-per-hour rate limit, and 10-minute human timeout pass;
- concurrent 401s single-flight one refresh and replay mutations once with their
  original idempotency key;
- missing rotated token invalidates the session; no auth failure becomes success;
- Email Address change rejects old identity, revokes every session, and requires
  new sign-in;
- Sign Out is blocked by a fixture Active Walk even though recording UI is not
  yet public, proving the identity port contract without exposing a speculative
  Feature dependency;
- secrets and personal identifiers are absent from evidence;
- the complete Access Account Journey passes on both main matrix runtimes.

## PR 5 — Migrate Manage Owner Profile and Preferences

### Outcome

Deliver current Owner display/edit, Avatar prepare/upload/replace/remove,
language, units, appearance, notification status/settings link, legal links,
About, Email Change entry, and Sign Out composition.

### API and contract

- Implements `owner` queries/update, Owner name invariants, purpose-bound media
  preparation, checksum/policy validation, compensation, and current Avatar.
- Keeps language/units/appearance/notification/About off the API.

### Mobile and Journey

- Implements `owner-profile` and `preferences`, DisplayPreferences capability,
  media normalization, system-settings, persistence adapters, Settings and Owner
  routes.
- Applies setting changes immediately and rolls back visible value when durable
  persistence fails.
- Promotes `Manage Owner Profile and Preferences`, including User Edit and
  Settings sections; Contribution areas of Me stay absent until PR 10.

### Exit criteria

- Owner name, no-change Save, dirty discard, last-write-wins/refetch, Avatar
  atomicity/removal/expiry/compensation, and broken-image fallback pass;
- Japanese/English, km/mile, Light/Dark/Auto persist and update consumers through
  the capability contract;
- notification Not Requested/On/Off reflects iOS settings after return;
- About shows real version/build without navigation; Terms/Privacy keep Settings
  usable on failure;
- Active Walk fixture still blocks Sign Out and points to the unavailable Walk
  recovery shell honestly;
- Owner/Profile/Settings Journey evidence passes without exposing Contribution.

## PR 6 — Migrate Manage Dogs and Goals

### Outcome

Deliver Dogs tab, list/empty/error, create, detail, edit, Archive, partial
Birthday, Gender, independent Daily/Weekly Goals, Avatar workflow, and Dog
selection projection for the later Walk slice.

### API and contract

- Implements `dog` application/domain, repositories, exact-name uniqueness,
  current/Archived lifecycle, Active Walk participation port, partial Birthday,
  Gender, Goals, and Dog media.
- Adds current Dogs, Dog detail, create/update/archive, and Dog Avatar operations.
  Breed remains a reserved database column outside all contracts.

### Mobile and Journey

- Implements `dogs` public Feature, routes, forms, media adapter, partial
  Birthday/age presentation, independent Goal editing, and in-memory/production
  contracts.
- Dog Detail exposes profile/Goal data only; contribution and history slots are
  absent until their owning slices.
- Promotes all Dogs List/Registration/Edit and Dog Detail profile/Goal sections.

### Exit criteria

- exact-character duplicate names fail while case/whitespace/Unicode variants
  remain allowed; Archived names do not reserve uniqueness;
- Birthday precision persists and age uses day 16 or July 1 only for calculation;
- Gender rejects unknown/missing/case/whitespace values;
- Daily 0–120 and Weekly 0–840 by five, defaults 30/120, zero/no-goal, and no
  cycle conversion pass;
- archive excludes current lists/selection, preserves references, and is blocked
  for an Active participant;
- Breed is absent from schema, operations, UI, fixtures, and evidence;
- complete Manage Dogs and Goals Journey passes.

## PR 7 — Migrate Record a Walk

### Outcome

Deliver Walk Ready/Starting/Recording/Finishing/Finished/Failed and recovery
states, Dog selection, foreground/background location, Track Point outbox/batch,
route quality, start/finish/interruption, restart/background/API reconciliation,
and hidden Interrupted semantics.

### API and contract

- Implements `walk_recording`, PostgreSQL/Track Point/DynamoDB/SQS ports,
  worker processing, idempotency, lifecycle transactions, distance/duration, and
  one Active Walk per Owner.
- Adds active/start/append/finish/interrupt operations and ordered per-point
  Accepted/Rejected results.

### Mobile and Journey

- Implements `walk-recording` XState system, `ActiveWalkContext`, SQLite
  repositories/outbox, location adapter, app lifecycle integration, stable map
  shell, permissions, reconciliation, and Walk tab states.
- Event controls remain absent until PR 8.
- After authoritative completion, shows a saved confirmation in the Walk shell
  and returns Ready because Review Walk History is not yet migrated. It does not
  create a placeholder detail route. PR 9 replaces this composition outcome with
  direct navigation to the real Completed Walk detail.
- Promotes `Record a Walk` excluding event/photo-owned sections.

### Exit criteria

- no Dog or no foreground location blocks Start before API mutation;
- durable local shell precedes acknowledged recording; failed Start creates no
  fake progress;
- background denial falls back to foreground; foreground loss/service disable or
  30 seconds without a valid point interrupts and returns Ready without detail;
- accuracy, monotonic time, 12 m/s, future time, batch identity/order, duplicate
  replay, and outbox cleanup contracts pass;
- app restart/background/API-only/local-only Active states reconcile exactly;
- finish computes nonnegative authoritative metrics, confirms the saved Walk and
  returns Ready; Interrupted remains absent from every exposed surface;
- map shell does not remount during Ready-to-Recording transitions;
- complete Record a Walk Journey and privacy-safe route evidence pass.

## PR 8 — Migrate Capture Walk Events

### Outcome

Deliver per-Dog Pee/Poop, camera/deep-link Photo, purpose-bound direct upload,
durable pending Event/Photo outbox, late sync, Retry/discard, and integration into
the unchanged recording shell.

### API and contract

- Implements `walk_event`, event/media repositories and ports, participant/time
  validation, distinct identities, idempotency, purpose-bound upload, and bounded
  late sync to Completed/Interrupted Walks.
- Adds Pee, Poop, Photo prepare/register operations; unknown writes are impossible.

### Mobile and Journey

- Implements `walk-events` with the sole direct Feature dependency on
  `walk-recording` public `ActiveWalkContext`.
- Persists each intent before acknowledgement; Photo normalization/upload may
  continue after Walk completion.
- Promotes `Capture Walk Events` and event/photo sections split from Walk Screen.

### Exit criteria

- every intentional tap creates one distinct event; in-flight button disabling
  and same-identity retry prevent accidental duplicate effects;
- multiple Dogs receive their explicit per-Dog event; nonparticipants fail;
- Photo size/dimensions/checksum, 15-minute upload expiry, 60-second timeout,
  compensation, pending-after-Finish, permanent failure, Retry, and discard pass;
- late durable events sync only within final boundaries; out-of-bound values fail;
- unknown read events and legacy out-of-bound events are omitted/count-safe;
- deep-link camera action executes once and is cleared;
- recording shell continuity and complete Capture Walk Events Journey pass.

## PR 9 — Migrate Review Walk History

### Outcome

Deliver Me all-Dog and Dog-preselected history, Archived Dog filters, fixed cursor
pages, refresh/next-page recovery, scroll/filter preservation, Completed detail,
route/events/photos, pending Photo presentation, and Active Walk redirect.

### API and contract

- Implements `walk_insight` history/detail read ports and projections, stable
  ordering, fixed 20 pages, opaque filter-bound cursor, current Owner/Dog
  references, Completed-only filtering, and isolated unavailable rows.
- Adds history/detail queries. Active and Interrupted never enter cursor math.

### Mobile and Journey

- Implements `walk-history` list/detail state, pagination, filters, mapping,
  current unit formatting, map/timeline/photo modal, pending Photo state, and
  route composition from Me/Dog.
- The route boundary reads `walk-recording` public state for Active redirect;
  `walk-history` does not import recording internals.
- Promotes all Walk History and Walk Detail sections plus Dog recent Walks.

### Exit criteria

- ordering ties, fixed pages, duplicate bottom events, invalid/cyclic cursors,
  next-page/refresh failure preservation, and scroll/filter restoration pass;
- All/current/Archived Dog filters use IDs; multi-Dog Walk appears once per
  applicable list; renamed current references update past presentation;
- bad metrics isolate one row, fail detail, and never become zero;
- unknown/out-of-bound events are omitted; known events preserve stable order;
- expired/missing/broken Photo is explicit and modal always closes;
- any detail intent during Active Walk redirects to recording without a loop;
- successful Finish now navigates directly to the real saved detail, replacing
  PR 7's temporary Ready confirmation without a compatibility path;
- complete Review Walk History Journey passes.

## PR 10 — Migrate Review Owner Contribution

### Outcome

Deliver Owner lifetime counts/distance/time, seven-day weekly graph, Walking
Since, per-Dog Completed progress/statistics, Daily/Weekly Goal comparison, unit
formatting, and complete Me/Dog composition.

### API and contract

- Extends `walk_insight` with authoritative Owner Contribution and Dog Walk
  Progress read models over complete Completed data.
- Adds contribution queries with explicit Unavailable results and controlled
  timezone/time-window inputs/outputs required for deterministic presentation.

### Mobile and Journey

- Implements `contribution` public Feature and composes it into Me and Dog Detail
  through routes. It consumes DisplayPreferences, never history pages or another
  Feature's state.
- Promotes User Screen aggregate/graph and Dog Detail statistics/progress sections.

### Exit criteria

- Completed only; multi-Dog counts once for Owner and once per Dog; zero remains
  valid while malformed values become Unavailable;
- device timezone, Monday week, startedAt classification, midnight/year/DST,
  multiple same-day Walks, no-Walk days, and timezone changes pass;
- aggregate unrounded seconds precede formatting; km/mile changes are consistent
  across active/history/detail/Dog/Me surfaces;
- Walking Since valid/missing/invalid/future behavior and safe contract evidence
  pass;
- Daily/Weekly progress uses independent Goal values without conversion;
- complete Review Owner Contribution Journey passes.

## PR 11 — Integrate, delete, and harden the full system

### Outcome

Prove the completed replacement as one system, finish negative architecture and
contract fixtures, remove every obsolete/out-of-scope artifact, enforce the full
CI matrix, measure flakiness/performance/resource cleanup, and freeze the final
knowledge/ADR/runbook state.

### Required work

- Run all seven Journeys across iOS 18.3 and 26.5 plus the nightly small-screen,
  accessibility, localization, appearance, units, timezone, failure, restart,
  concurrency, and privacy matrix.
- Verify every PR #366/#367 negative rule remains blocking with AI review absent.
- Verify every normalized statement maps to one Journey scenario, API/Mobile
  contract, and evidence comparison.
- Delete old Compose/runbooks/scripts/schema/types/operations/tests/snapshots,
  obsolete dependencies, Breed UI/API, Watch/Live Activity, Android/Web, and all
  expired exceptions.
- Update CONTEXT, ADRs, root maps, local Harness runbook, Journey catalog, quality
  score, lessons learned, and validator rules for every migration finding.

### Exit criteria

- every deterministic PR/main/nightly/release gate is required and green;
- intentional architecture, schema drift, privacy, setup, Journey, cleanup,
  resource leak, and observability failures fail the expected stable rule;
- no TODO/TBD/placeholder, unused export/dependency, compatibility alias, dual
  runtime, dead route, unowned file, expired exception, or old asset remains;
- flake repetitions have zero unexplained nondeterminism and no retry converts a
  failure to success;
- evidence retention and artifact privacy are verified;
- final input-to-output audit is complete before human review.

## Requirement-to-slice summary

| Acceptance inventory | Primary slice | Later composition |
| --- | --- | --- |
| Sign Up | PR 4 | PR 11 full matrix |
| Login | PR 4 | PR 7 Active Walk auth recovery |
| Email Change | PR 4 | PR 5 Settings entry |
| User Edit | PR 5 | PR 10 complete Me composition |
| Settings | PR 5 | PR 7 real Active Walk Sign Out block |
| User Screen | PR 10 | none |
| Dogs List | PR 6 | PR 10 progress decoration |
| Dog Registration | PR 6 | none |
| Dog Edit | PR 6 | PR 7 real Active participant block |
| Dog Detail | PR 6 | PR 9 history, PR 10 progress |
| Walk Screen | PR 7 | PR 8 events/photos |
| Walk History List | PR 9 | PR 10 no dependency |
| Walk Detail | PR 9 | PR 8 event/media inputs already complete |

The primary slice owns and promotes its source sections according to the
ownership map; later composition does not redefine the earlier owner. Any fixture
used before the real producer slice is a contract fixture, not a public partial
Journey, and is deleted or converted when the producer migrates.

## Self-review

The sequence was checked against both architecture delivery orders, all module
and Feature dependencies, the GraphQL operation matrix, Harness prerequisites,
the approved wireflow, and every normalized inventory.

Findings resolved during review:

1. Walk History was placed after Capture Walk Events so its first public detail
   contract includes complete event/photo behavior rather than a partial timeline.
2. Review Owner Contribution was placed after History so it consumes complete API
   read models, never a bounded Mobile page.
3. Foundation schema generation was given a bootstrap-only revision query so PR 3
   can prove deterministic schema/codegen without exposing a speculative product
   field.
4. Pre-slice Active Walk fixtures used by auth/archive checks are explicitly
   contract fixtures and cannot be presented as migrated UI behavior.
5. The approved visual artifact and review outcome are recorded before planning
   user-facing implementation.
6. PR 7 no longer invents a placeholder Walk Detail. It uses an explicit saved
   confirmation until PR 9 delivers the separately owned Review History Journey;
   the wireflow records both stage outcomes.

No dependency cycle, partially exposed Journey, layer-only product merge,
compatibility period, production-data migration, or unresolved sequence decision
remains. Exact file paths, code/test steps, commands, and expected outputs belong
to the file-level roadmap ticket that consumes this sequence.
