# Domain and Journey Ownership Map

## Purpose

This map assigns every normalized acceptance area to one primary user journey,
API application module, and Mobile feature module. It is the ownership input for
the API and Mobile architecture kernels and the later implementation roadmap.
Acceptance outcomes remain authoritative in
`docs/wayfinder/2026-07-11-acceptance-spec-normalization.md`.

## Ownership rules

- A user journey is an Owner goal, not a screen or technical transaction.
- Every acceptance statement has exactly one primary journey owner. Other
  journeys may consume its outcome but do not redefine it.
- API application modules group commands and queries that share invariants and
  transactional meaning. GraphQL is an adapter, not an owner.
- Mobile features group UI, local state, orchestration, and feature-specific
  adapters that change for the same Owner goal.
- Routes and app-shell composition may combine public feature interfaces. A
  feature never imports another feature's internal hooks, stores, components,
  GraphQL documents, or adapters.
- Platform capabilities such as authenticated transport, display preferences,
  secure storage, media I/O, clocks, and localization are injected through
  public interfaces rather than accessed through application-wide mutable state.

## Canonical user journeys

| Journey | Owner outcome | Primary product axis |
| --- | --- | --- |
| Access Account | Enter, recover, change identity for, or leave the authenticated application safely | Owner contribution |
| Manage Owner Profile and Preferences | Keep the Owner identity and device presentation accurate and usable | Owner contribution |
| Manage Dogs and Goals | Maintain the current Dogs and a realistic time target for each | Dog experience |
| Record a Walk | Turn a selected Dog outing into one valid Completed Walk, or safely interrupt it | Data-Maximized Walks |
| Capture Walk Events | Preserve per-Dog moments during a Walk without duplicates or data loss | Dog experience |
| Review Walk History | Revisit Completed Walk routes, events, photos, and participants | Data-Maximized Walks |
| Review Owner Contribution | Understand Owner and per-Dog progress derived from Completed Walks | Owner contribution |

All three product axes remain review considerations for every journey. The
primary axis identifies the outcome the journey most directly advances.

## API application ownership

| Module | Owns | Does not own |
| --- | --- | --- |
| `identity` | OTP challenges, verification, token refresh, Email Address change, session revocation | Owner profile, secure-device storage, navigation |
| `owner` | Owner profile reads/updates and Avatar reference changes | Device preferences, Contribution aggregation, media infrastructure |
| `dog` | Current/Archived Dog lifecycle, exact-name uniqueness, Gender, Birthday, Walk Goal | Walk selection, history aggregation, object storage mechanics |
| `walk_recording` | start, single Active Walk, Track Point intake, recovery, Completed/Interrupted finalization, distance and duration | Event meaning, history presentation, queue/database mechanics |
| `walk_event` | Pee/Poop/Photo Event validity, participant association, time boundaries, idempotent late sync | Active Walk lifecycle, media infrastructure, history projection |
| `walk_insight` | Completed-only Walk History/detail, cursor pagination, Contribution, Dog Walk Progress | lifecycle mutations, Goal mutation, Mobile formatting preferences |

Media is a shared application port and policy used by `owner`, `dog`, and
`walk_event`; S3/MinIO, object keys, upload transport, and compensation are
adapters. Track-point persistence and delivery are ports of `walk_recording`.
Cognito is an adapter of `identity`.

Application modules do not import or invoke one another. A module defines the
ports needed to make its own decision: for example, `dog` owns an
`ActiveWalkParticipation` port and `walk_event` owns an `EventWalkContext` port.
Adapters satisfy those contracts with the required transaction and locking
semantics. `walk_insight` builds projections from read ports rather than calling
mutation modules. The composition root wires modules to adapters but owns no
domain decision. Account-to-Owner provisioning is an idempotent `identity` use
case through an `OwnerProvisioning` port; it does not pretend Cognito and
PostgreSQL share a distributed transaction.

## API domain namespaces

| Namespace | Owns |
| --- | --- |
| `domain::identity` | AccountId, Email Address, Authenticated Session, authentication challenge values |
| `domain::owner` | OwnerId, Owner, OwnerName, Avatar reference |
| `domain::dog` | DogId, current/Archived Dog, DogName, Gender, Birthday, Walk Goal, Dog Walk Progress values |
| `domain::walk` | WalkId, lifecycle state, Walker, Track Point, Walk Event, event idempotency identity, Walk History, Contribution |

Application modules import only the namespaces they need. IDs are owned by their
domain namespace and are not collapsed into a generic entity ID. Domain
namespaces may refer to another aggregate by its typed ID or explicit value but
do not embed the foreign aggregate. GraphQL objects, SeaORM models, AWS SDK
types, cursor mechanics, clocks, and upload/storage transport types are not
domain types. New canonical types must not use ambiguous names such as User,
Record, Data, or Item.

## Mobile feature ownership

| Feature | Public responsibility | Composition consumers |
| --- | --- | --- |
| `account-access` | Auth screens, challenge state, Authenticated Session lifecycle, Email Address change and Sign Out | app shell |
| `owner-profile` | Owner summary/edit surfaces and Avatar workflow | Me route |
| `preferences` | language, units, appearance, notification permission, About, legal links | app shell and Settings route |
| `dogs` | Dogs list/create/detail/edit/archive, Gender, Birthday, Avatar, Walk Goal editing | Dogs routes and Walk-ready composition |
| `walk-recording` | selection projection, permissions, GPS, state machine, durable Active Walk recovery and finish | Walk route and app lifecycle |
| `walk-events` | per-Dog actions, camera, event outbox, Pending Walk Events and retry | Walk recording composition |
| `walk-history` | history list/filter/page state, Walk detail, route/events/photos presentation | Me and Dog routes |
| `contribution` | Owner totals/weekly graph and Dog Walk Progress presentation | Me and Dog routes |

The only direct feature dependency is `walk-events` on the public
`ActiveWalkContext` exported by `walk-recording`. Me composes `owner-profile` and
`contribution`; Dog detail composes `dogs`, `contribution`, and `walk-history` at
the route boundary. Authenticated transport and `DisplayPreferences` are
app-shell capabilities, not feature dependencies.

Every feature exposes one public entrypoint and declares allowed imports,
exports, owned journeys, adapters, and tests in `module.yaml`. A validator rejects
undeclared feature imports and imports through another feature's internal path.

## Acceptance inventory ownership

| Source inventory | Primary journey | API owner | Mobile owner | Secondary composition |
| --- | --- | --- | --- | --- |
| `signup-e2e-test-cases.md` | Access Account | `identity` | `account-access` | app shell injects configured Legal Links capability |
| `login-screen-e2e-test-cases.md` | Access Account | `identity` | `account-access` | app shell enters authenticated tabs |
| `email-change-screen-e2e-test-cases.md` | Access Account | `identity` | `account-access` | `owner-profile` displays the resulting Email Address |
| `user-edit-screen-e2e-test-cases.md` | Manage Owner Profile and Preferences | `owner` | `owner-profile` | media port/adapter |
| `settings-screen-e2e-test-cases.md` | Manage Owner Profile and Preferences | `identity` only for Sign Out; otherwise none | `preferences`; `account-access` owns Sign Out action | app shell composes the Settings route |
| `user-screen-e2e-test-cases.md` | Review Owner Contribution | `walk_insight`; `owner` supplies profile | `contribution` | Me route composes `owner-profile` |
| `dogs-list-e2e-test-cases.md` | Manage Dogs and Goals | `dog` | `dogs` | `contribution` projection may decorate rows through route composition |
| `dog-registration-e2e-test-cases.md` | Manage Dogs and Goals | `dog` | `dogs` | media port/adapter |
| `dog-edit-screen-e2e-test-cases.md` | Manage Dogs and Goals | `dog` | `dogs` | `ActiveWalkParticipation` port enforces archive prohibition |
| `dog-detail-screen-e2e-test-cases.md` | Manage Dogs and Goals | `dog` | `dogs` | route composes `contribution` and `walk-history` |
| `walk-screen-e2e-test-cases.md` | Record a Walk | `walk_recording`; `walk_event` for event commands | `walk-recording` | route composes `walk-events` |
| `walk-history-list-e2e-test-cases.md` | Review Walk History | `walk_insight` | `walk-history` | Dog and Me routes provide entry context |
| `walk-detail-screen-e2e-test-cases.md` | Review Walk History | `walk_insight` | `walk-history` | active-state redirect reads `walk-recording` capability at route boundary |

`walk-events-photo.md` behavior embedded in the broad walk-screen inventory is
owned by Capture Walk Events, `walk_event`, and `walk-events`, even though the
source file's primary owner is Record a Walk. Requirement-level traceability in
the final roadmap must split those rows rather than assigning the whole file to
one implementation task.

## Requirement-area exceptions

The source files are screen inventories, so the following areas intentionally
override their file-level primary owner:

| Requirement area | Journey | API owner | Mobile owner |
| --- | --- | --- | --- |
| Pee, Poop, Photo actions and offline retry in Walk screen | Capture Walk Events | `walk_event` | `walk-events` |
| Dog statistics and Goal progress in Dog detail | Review Owner Contribution | `walk_insight` | `contribution` |
| Dog recent Walks in Dog detail | Review Walk History | `walk_insight` | `walk-history` |
| Owner profile header/edit navigation in Me | Manage Owner Profile and Preferences | `owner` | `owner-profile` |
| Settings navigation from Me | Manage Owner Profile and Preferences | none | `preferences` |
| Sign Out in Settings | Access Account | `identity` | `account-access` |
| Active Walk redirect from Walk detail | Record a Walk | `walk_recording` | `walk-recording` |

## Source-section ownership audit

Section numbers refer to the numbered headings in each source inventory. Shared
accessibility and evidence sections inherit the owners of the behaviors they
exercise; they are not separate journeys.

| Source | Sections and primary Mobile owner |
| --- | --- |
| Sign Up | 1–6 `account-access` |
| Login | 1–7 `account-access` |
| Email Change | 1–7 `account-access` |
| Settings | 1–6 `preferences`; 7 `account-access`; 8 inherits both |
| User Edit | 1–11 `owner-profile` |
| User Screen | 1–4, 7 `owner-profile`; 5–6 `contribution`; 8 `account-access`; 9 `preferences`; 10–12 inherit affected owners |
| Dogs List | 1–9 `dogs`; any progress decoration is `contribution` composed at the route |
| Dog Registration | 1–13 `dogs`; Breed statements are excluded by the normalized scope |
| Dog Edit | 1–6 `dogs` |
| Dog Detail | 1–2, 6 `dogs`; 3–4 `contribution`; 5 `walk-history`; 7 inherits all three |
| Walk Screen | 1–8, 11–12 `walk-recording`; 9–10 `walk-events`; 13–14 inherit both |
| Walk History List | 1–13 `walk-history` |
| Walk Detail | 1, 3–12 `walk-history`; 2 `walk-recording` redirect capability |

This audit assigns every numbered source section once. Requirement-level rows
that cross a section boundary use the explicit exception table above; no
screen-file owner may absorb the behavior merely because it renders the result.

## Boundary scenarios

- Renaming an Owner changes current profile presentation through `owner`; past
  Walk detail resolves that current reference through `walk_insight` without
  giving history ownership of profile mutation.
- Archiving a Dog is a `dog` command. Its `ActiveWalkParticipation` port determines
  whether the Dog is in the Active Walk within the same transactional contract;
  `dog` owns the prohibition and outcome. Completed history continues to resolve
  the Archived Dog by identifier.
- Finishing a Walk belongs to `walk_recording`. Pending Photo Event upload and
  registration continue under `walk-events`/`walk_event`; completion does not
  transfer lifecycle ownership to the event module.
- Interrupted Walks remain internal lifecycle records of `walk_recording` and are
  excluded by `walk_insight` before history pagination or aggregation.
- Walk Goal mutation belongs to `dog`; progress calculation belongs to
  `walk_insight`; progress presentation belongs to `contribution`.
- Unit selection belongs to `preferences`; canonical metric values belong to
  `walk_insight`; localized formatting belongs to the consuming Mobile feature
  through injected `DisplayPreferences`.

## Superseded harness journey mapping

The six existing journey files are migration inputs, not final boundaries:

| Existing journey | Canonical replacement |
| --- | --- |
| Auth Onboarding | Access Account |
| Dog Profile | Manage Dogs and Goals |
| Walk Goal | Manage Dogs and Goals + Review Owner Contribution |
| Walk Lifecycle | Record a Walk |
| Walk Events And Photo | Capture Walk Events |
| Walk History And Owner Contribution | Review Walk History + Review Owner Contribution |

The later harness ticket must create/update canonical journey contracts and
Maestro evidence without retaining overlapping ownership from the old files.
