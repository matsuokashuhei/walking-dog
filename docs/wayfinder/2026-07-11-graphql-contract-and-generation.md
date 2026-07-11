# Replacement GraphQL Contract and Generation Workflow

## Purpose

This document defines the only API–Mobile product contract for the replacement
system. It covers every normalized Journey without preserving the current schema,
Mobile operation names, handwritten types, aliases, or runtime compatibility.
API application modules own decisions; GraphQL adapts typed inputs and outcomes;
Mobile Features own operations and map generated transport types into their
domain models.

Inputs:

- PR #366 API architecture prevention design
- PR #367 Mobile architecture prevention design
- `docs/wayfinder/2026-07-11-acceptance-spec-normalization.md`
- `docs/wayfinder/2026-07-11-domain-journey-ownership-map.md`
- the API and Mobile architecture-kernel documents
- all 13 inventories under `docs/tmp-testcases/`

## Contract principles

- The schema models canonical domain and read-model outcomes, never current
  screens or database rows.
- Every root field maps to exactly one API application command or query.
- Resolvers translate transport values and do not perform retries, storage,
  aggregation, authorization policy, or lifecycle decisions.
- Types are non-null by default. `null` represents only a valid absence such as
  no Birthday or Avatar, never loading, Not Found, failure, or bad provider data.
- Expected operation-specific failures are non-null result unions. GraphQL
  top-level errors are reserved for authentication transport failure, invalid
  GraphQL documents, and unexpected faults.
- There is no global Node interface, generic record type, arbitrary JSON scalar,
  client-selected page size, compatibility alias, or speculative subscription.
- API metric values are canonical metres and seconds. Mobile owns unit and locale
  formatting, not aggregation or time-window calculation.

## Root query contract

Queries are Journey/read-model entrypoints rather than a giant nested `viewer`:

```graphql
type Query {
  currentOwner: CurrentOwnerResult!
  currentDogs: CurrentDogsResult!
  dog(id: DogId!): DogResult!
  activeWalk: ActiveWalkResult!
  walkHistory(filter: WalkHistoryFilter!, after: Cursor): WalkHistoryResult!
  walk(id: WalkId!): WalkDetailResult!
  ownerContribution: OwnerContributionResult!
  dogContribution(dogId: DogId!): DogContributionResult!
}
```

`currentOwner` is owned by `owner`; `currentDogs` and `dog` by `dog`;
`activeWalk` by `walk_recording`; and history/detail/contribution fields by
`walk_insight`. Nested object fields contain values already returned by the
application query. They cannot trigger another application module or database
lookup. Cross-Feature screens call and compose public Feature interfaces rather
than growing a screen-shaped GraphQL query.

## Root mutation contract

The replacement mutation surface is:

| API owner | Mutations |
| --- | --- |
| `identity` | `requestSignInCode`, `verifySignInCode`, `requestSignUpCode`, `verifySignUpCode`, `requestEmailChangeCode`, `verifyEmailChangeCode`, `refreshSession`, `signOut` |
| `owner` | `prepareOwnerAvatarUpload`, `updateOwner` |
| `dog` | `prepareDogAvatarUpload`, `createDog`, `updateDog`, `archiveDog` |
| `walk_recording` | `startWalk`, `appendTrackPoints`, `finishWalk`, `interruptWalk` |
| `walk_event` | `recordPeeEvent`, `recordPoopEvent`, `prepareWalkPhotoUpload`, `recordPhotoEvent` |

Settings language, units, appearance, and notification status are device state
and have no GraphQL mutation. Breed has no GraphQL type, field, filter, input, or
operation. Contribution and history are read models and expose no mutation.

Every side-effecting input contains `idempotencyKey: IdempotencyKey!`. Separate
Pee, Poop, and Photo mutations prevent an unknown or unsupported event enum from
being written. `interruptWalk` is an explicit terminal command used for location,
authentication-recovery, and irrecoverable recording failure; it never creates a
Mobile-visible history entry.

## Typed result and problem model

Each root field returns an operation-specific union whose success member is
named after the operation. It includes only problems the caller can handle. For
example:

```graphql
union CreateDogResult =
    CreateDogSuccess
  | ValidationProblem
  | DuplicateDogNameProblem
  | MediaUploadProblem
  | RetryableProblem

type CreateDogSuccess { dog: Dog! }

interface Problem {
  code: ProblemCode!
  retryability: Retryability!
  correlationId: CorrelationId!
}
```

Problem implementations may add closed, safe metadata:

- `ValidationProblem`: non-empty `[FieldViolation!]!` with a closed field enum
  and validation code; no localized message;
- `DuplicateDogNameProblem`: the `NAME_ALREADY_EXISTS` code only, without
  returning another Dog;
- `NotFoundProblem`: no existence, ownership, or authorization distinction;
- `InvalidCursorProblem`: no decoded ordering/filter content;
- `IdempotencyConflictProblem`: the operation and key fingerprint identifier,
  never either request body;
- `RetryableProblem`: a closed reason and optional `retryAfter` instant;
- `MediaUploadProblem`: expired, incomplete, checksum, media-policy, or purpose
  category without object key or signed URL;
- `ContractProblem`: used only where a read model can isolate one unavailable row
  or aggregate while preserving safe surrounding data.

`retryability` is `NEVER`, `SAME_INPUT`, or `AFTER_USER_ACTION`. The API never
returns UI prose, provider exception strings, SQL/storage details, tokens, OTPs,
precise coordinates, object keys, or signed URLs in a Problem. Mobile maps the
union exhaustively by `__typename`; an unknown member or impossible metadata is a
contract violation rather than a fallback.

### Required result matrix

`IdempotencyConflictProblem` is additionally present on every mutation, and the
shared 401 envelope may replace any authenticated operation before its resolver.
The remaining required members are:

| Operation | Success/no-data outcome | Required operation problems |
| --- | --- | --- |
| `currentOwner` | `CurrentOwnerSuccess` | `RetryableProblem`, `ContractProblem` |
| `currentDogs` | `CurrentDogsSuccess` with possibly empty list | `RetryableProblem`, `ContractProblem` |
| `dog` | `DogSuccess` | `NotFoundProblem`, `RetryableProblem`, `ContractProblem` |
| `activeWalk` | `ActiveWalkSuccess` or `NoActiveWalk` | `RetryableProblem`, `ContractProblem` |
| `walkHistory` | `WalkHistorySuccess` | `NotFoundProblem` for Dog filter, `InvalidCursorProblem`, `RetryableProblem`, `ContractProblem` |
| `walk` | `WalkDetailSuccess` | `NotFoundProblem`, `RetryableProblem`, `ContractProblem` |
| `ownerContribution` | `OwnerContributionSuccess` | `RetryableProblem`, `ContractProblem` |
| `dogContribution` | `DogContributionSuccess` | `NotFoundProblem`, `RetryableProblem`, `ContractProblem` |
| code-request mutations | challenge with code length, expiry, resend time | `ValidationProblem`, `RateLimitedProblem`, `RetryableProblem` |
| code-verification mutations | rotated `AuthenticatedSession` or Email-change completion | `ValidationProblem`, `ChallengeInvalidProblem`, `ChallengeExpiredProblem`, `ChallengeConsumedProblem`, `RateLimitedProblem`, `RetryableProblem` |
| `refreshSession` | rotated `AuthenticatedSession` | `InvalidSessionProblem`, `RetryableProblem` |
| `signOut` | `SignOutSuccess` | `ActiveWalkBlocksSignOutProblem`, `RetryableProblem` |
| Avatar prepare mutations | upload ID, redacted-at-boundary PUT URL, expiry | `ValidationProblem`, `MediaUploadProblem`, `RetryableProblem` |
| `updateOwner` | final current Owner | `ValidationProblem`, `MediaUploadProblem`, `RetryableProblem` |
| `createDog` | created current Dog | `ValidationProblem`, `DuplicateDogNameProblem`, `MediaUploadProblem`, `RetryableProblem` |
| `updateDog` | final current Dog | `NotFoundProblem`, `ValidationProblem`, `DuplicateDogNameProblem`, `MediaUploadProblem`, `RetryableProblem` |
| `archiveDog` | archived Dog ID | `NotFoundProblem`, `ActiveWalkParticipantProblem`, `RetryableProblem` |
| `startWalk` | authoritative Active Walk | `ValidationProblem`, `NotFoundProblem`, `ActiveWalkAlreadyExistsProblem`, `RetryableProblem` |
| `appendTrackPoints` | ordered result for every point | `NotFoundProblem`, `WalkNotActiveProblem`, `ValidationProblem`, `RetryableProblem` |
| `finishWalk` | authoritative Completed Walk ID and metrics | `NotFoundProblem`, `WalkNotActiveProblem`, `ValidationProblem`, `RetryableProblem` |
| `interruptWalk` | hidden Interrupted acknowledgement | `NotFoundProblem`, `WalkNotActiveProblem`, `ValidationProblem`, `RetryableProblem` |
| Pee/Poop mutations | committed Event | `NotFoundProblem`, `EventOutsideWalkProblem`, `ValidationProblem`, `RetryableProblem` |
| `prepareWalkPhotoUpload` | upload ID, redacted-at-boundary PUT URL, expiry | `NotFoundProblem`, `ValidationProblem`, `MediaUploadProblem`, `RetryableProblem` |
| `recordPhotoEvent` | committed or idempotently replayed Photo Event | `NotFoundProblem`, `ValidationProblem`, `MediaUploadProblem`, `EventOutsideWalkProblem`, `RetryableProblem` |

Rate-limit results expose only an absolute `retryAfter`. Authentication session
success contains non-null access and refresh tokens and their expiries, but those
fields are classified secret and may be consumed only by `account-access` secure
storage. Email-change success contains no reusable challenge or old identity and
signals that every session has been revoked.

Event registration accepts an Active Walk, or a Completed Walk when the original
event time lies inside its finalized boundary. This permits durable offline
outbox replay after completion. Mobile permits creation of a new intent only
while Active; the API independently enforces Owner, participant, time boundary,
event identity, and idempotency. Interrupted Walks likewise accept a bounded
original outbox event after finalization, but never expose it to history or
aggregates.

History isolation uses an explicit row union:

```graphql
union WalkHistoryItem = WalkSummary | WalkDataUnavailable
type WalkConnection { nodes: [WalkHistoryItem!]!, pageInfo: PageInfo! }
```

`WalkDataUnavailable` contains the stable Walk ID and safe retry classification,
not fabricated zero metrics. Walk detail returns a whole-operation
`ContractProblem`; contribution and Dog progress return explicit Unavailable
results. Empty successful lists remain `[]`.

## Authentication and authorization envelope

Missing, expired, malformed, or unverifiable access credentials are a shared
transport failure, not an operation-union member. The API returns HTTP 401, no
partial data, and one top-level GraphQL error with extension code
`AUTHENTICATION_REQUIRED` plus a safe correlation ID. The response never reveals
token claims or provider cause.

The Mobile authenticated transport single-flights concurrent refresh attempts,
then replays each original operation at most once with identical variables and
idempotency key. Refresh uses rotation and succeeds only when both new access and
refresh tokens exist. Failure invalidates the session and invokes the normalized
Active Walk authentication-recovery contract. Public authentication mutations
are an explicit middleware allowlist and cannot recursively refresh.

An authenticated Owner asking for another Owner's Dog, Walk, or media receives
the same operation-specific `NotFoundProblem` as an invalid identifier. This is
application authorization, not a 401. Unexpected faults produce a top-level
`INTERNAL` code, no partial data, and sanitized observability; they never become
an empty success or generic retryable union member.

## Scalars and value contracts

Meaningful values use validated custom scalars:

| Scalar | Contract |
| --- | --- |
| `OwnerId`, `DogId`, `WalkId`, `WalkEventId`, `TrackPointId`, `MediaUploadId` | canonical opaque UUID representation and distinct Mobile brand |
| `IdempotencyKey` | client-generated UUID; never returned in logs/evidence |
| `Cursor` | opaque, versioned, filter-bound pagination state |
| `DateTime` | canonical RFC 3339 UTC instant; offset input normalized to UTC |
| `CalendarYear` | integer 1900 through API clock current year where used |
| `EmailAddress` | trimmed/lowercased valid address, at most 254 characters, no controls |
| `OwnerName`, `DogName` | validated user-perceived-character values with distinct whitespace rules |
| `OtpCode` | ASCII digits whose exact length is checked against its challenge |
| `GoalMinutes` | integer minutes validated against its Daily or Weekly context |
| `DistanceMeters` | finite, nonnegative decimal |
| `DurationSeconds` | nonnegative integer |
| `Latitude` | finite -90 through 90 |
| `Longitude` | finite -180 through 180 |
| `HorizontalAccuracyMeters` | finite and nonnegative |
| `MediaUrl` | opaque HTTPS read URL with no exposed storage-key contract |
| `MediaChecksum` | lowercase SHA-256 digest |
| `CorrelationId` | opaque diagnostic identifier containing no user data |

Each scalar is enforced at GraphQL parse/serialize, API value construction, and
Mobile parsing with positive/negative contract fixtures. Codegen maps scalar
inputs to their branded input type but scalar outputs to `unknown`, with
`strictScalars: true`; a Feature GraphQL adapter must parse and construct its
domain value. No cast may turn a plain string or number into a branded Mobile
value.

Birthday output is a union of `YearBirthday`, `YearMonthBirthday`, and
`FullDateBirthday`, with all member fields non-null. Birthday input is a validated
`BirthdayInput` scalar accepting exactly `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; it
preserves precision and never guesses a missing component. Absence is the one
nullable Birthday field. Gender is a non-null `MALE | FEMALE | OTHER` enum.

### Input invariants

- Owner names are 1–50 user-perceived characters after trimming and reject
  newline/control characters. Dog names are 1–50, preserve surrounding
  whitespace, reject whitespace-only/newline/control values, and use exact
  character-sequence uniqueness.
- Authentication inputs normalize Email Address before application handling.
  Challenge output supplies exact `codeLength`; Sign In accepts eight digits and
  Sign Up/Email Change six. Unexpected length is a contract failure.
- Dog create/update accepts independent `dailyGoalMinutes` and
  `weeklyGoalMinutes`: Daily is 0–120, Weekly 0–840, both multiples of five.
  Omitted unchanged update fields use an explicit patch input, while clearing
  Birthday or Avatar uses an explicit clear operation rather than ambiguous null.
- `startWalk` requires a non-empty, duplicate-free list of current Dog IDs.
  Event inputs require participant Dog ID, original `occurredAt`, and identity;
  Photo additionally requires a purpose-bound `MediaUploadId`.
- Future Walk, Event, and Track Point instants fail using the API controlled clock
  with no skew allowance. A finalized Event must lie within its Walk boundary.

## Read models

`Owner`, `Dog`, `ActiveWalk`, `WalkSummary`, `WalkDetail`,
`OwnerContribution`, and `DogContribution` expose only normalized values.
Important constraints include:

- Avatar/Photo references expose a CDN read URL as an opaque `MediaUrl` value;
  storage keys and signing details never appear.
- Current Dog reads exclude Archived Dogs. History filters can explicitly name a
  current or Archived Dog by ID and resolve its final current name.
- Walk History and detail expose Completed Walks only. `activeWalk` is the only
  public Active representation. Interrupted Walks have no query surface.
- A Completed Walk has non-null `startedAt`, `endedAt`, `distanceM`, and
  `durationSec`. Invalid timestamps or metrics cannot serialize as a normal Walk.
- Walk participants and Walker resolve current names/images rather than snapshots.
- Event order is `occurredAt ASC, eventId ASC`; unknown and out-of-bound stored
  events are omitted before transport and counted only in privacy-safe
  observability.
- Contribution and progress are complete API read models over Completed Walks,
  not calculations over the current history page. They expose canonical seconds,
  metres, counts, and server-selected daily/weekly buckets with UTC instants for
  boundaries and no display strings.

## History connection and cursor

`WalkHistoryFilter` is exactly All Dogs or one Dog ID; it has no date, Walker, or
page-size field. The API returns fixed 20-item pages ordered by `startedAt DESC,
walkId DESC`. Active and Interrupted Walks are excluded before cursor calculation.
A multi-Dog Walk appears once for All Dogs and once in each applicable Dog filter.

`PageInfo` has nullable `endCursor` and non-null `hasNextPage`. A successful empty
page is valid only with no cursor and `hasNextPage: false`. The opaque cursor
contains a version, ordering keys, and filter identity but no PII or storage data.
Malformed, changed-filter, cyclic, and unsupported-version cursors return
`InvalidCursorProblem`. Mobile preserves server order, rejects duplicated IDs,
and rejects inconsistent pageInfo; it never sorts, deduplicates, or repairs.

## Idempotency

Every side-effecting mutation uses `Owner + operation + IdempotencyKey` as its
scope. The API hashes canonical validated input. Same key and fingerprint replays
the original committed result; same key with a different fingerprint returns
`IdempotencyConflictProblem`. Provider calls, resolvers, queues, and storage
adapters never replace the caller identity.

Identity and fingerprint are retained for the lifetime of created Dogs, Walks,
Walk Events, Track Points, and other durable entities. Commands without a
separately durable created entity retain result and fingerprint for 30 days.
After that boundary, a new user intent requires a new key. Mobile retains pending
Event, Photo, and Track Point identities without expiry until success or explicit
discard. Controlled-clock tests prove the cleanup boundary.

## Media workflow

Image bytes do not pass through GraphQL multipart upload. The purpose-specific
prepare mutations receive declared JPEG MIME, byte count, dimensions, checksum,
and idempotency key. They validate the Avatar or Walk Photo policy and return a
15-minute, one-use signed PUT URL plus opaque `MediaUploadId`. The URL is the sole
intentional signed-URL exposure and is always redacted from logs/evidence.

Mobile normalizes and validates locally, uploads with a 60-second request timeout,
then passes only `MediaUploadId` to create/update/photo-event mutation. The owning
application module revalidates Owner, purpose, expiry, checksum, and object facts.
The database reference commits before an old Avatar is deleted. Failed database
commit compensates the new object. Uncommitted objects are reaped after expiry.
Pending Walk Photos preserve the same event identity until registration succeeds;
Walk completion does not wait for them.

## Track Point batch contract

`appendTrackPoints` accepts 1–50 points ordered by `recordedAt ASC,
trackPointId ASC`. Each point carries a stable TrackPoint ID, original GPS instant,
latitude, longitude, and accuracy. Mobile sends the SQLite outbox and retries the
same IDs and mutation identity.

Structural invalidity, future time, another Walk/Owner, non-Active lifecycle, or
same TrackPoint ID with different input fails the entire batch as a typed result.
Quality rejection is per point: accuracy over 50 metres, time not later than the
last accepted point, or implied speed over 12 m/s returns
`RejectedTrackPoint` and never changes route/distance. The success member contains
exactly one ordered Accepted/Rejected result per input ID. Missing, duplicate, or
reordered results are a Mobile contract violation. Only confirmed results leave
the outbox.

The 30-second no-valid-point interruption uses the original GPS timeline and
current Walk state, not transport batching latency. API and Mobile controlled
clocks verify foreground loss, delayed upload, recovery, and terminal interruption.

## Operation ownership

Each Mobile operation and fragment belongs to exactly one Feature under
`features/<feature>/adapters/graphql/operations/`. Operation names carry the
Feature prefix. A Feature may reuse its own fragment, but there is no global or
cross-Feature fragment library. The same field may be selected independently for
different Feature domain mappings.

The Mobile architecture compiler compares document location, operation prefix,
import sites, Feature manifest, API field owner, and affected Journeys. Routes,
UI, domain, and public Feature types cannot import operations or generated
transport types. Screen composition happens through public Feature interfaces,
not by sharing one large query.

## Checked-in schema and code generation

The Rust schema definition is the executable source. The `api-bootstrap` schema
binary deterministically writes `apps/api/schema.graphql`, which is committed and
read-only to humans. Mobile codegen consumes that local file only; remote
introspection is forbidden.

GraphQL Code Generator uses pinned versions of `typescript`,
`typescript-operations`, and `typed-document-node`. It generates
`TypedDocumentNode<Result, Variables>` values under
`apps/mobile/generated/graphql`, with `avoidOptionals: true`, string-union enums,
immutable values, exact operation/result types, `strictScalars: true`, branded
custom-scalar inputs, and `unknown` custom-scalar outputs. It generates no React
hooks, cache runtime, fragment-masking runtime, or client-specific types.

`platform/graphql` uses standard `fetch` to execute the typed document. TanStack
Query is the refetchable server-cache owner at the Feature boundary. Apollo,
Relay, Graffle, handwritten GraphQL strings, handwritten response/variable types,
`any`, unchecked casts, and parallel transport runtimes are absent.

## Atomic schema-change workflow

Schema and consumer changes are one merge unit:

1. change API Rust schema/application contracts;
2. regenerate checked-in schema;
3. update Feature-owned operations;
4. regenerate Mobile typed documents;
5. run API result/scalar/auth/idempotency contracts;
6. run operation validation and Mobile adapter contracts;
7. run selected canonical Journeys and privacy evidence;
8. prove a second generation produces no diff.

The Intent declares `none`, `non-breaking`, or `breaking` schema impact and the
actual semantic diff must agree. Since API and Mobile deploy from this repository,
breaking changes are atomic and preferred over aliases or deprecation periods.
Old/new fields, compatibility aliases, and indefinite deprecated fields are
forbidden. Main never contains an API/Mobile contract mismatch.

## Drift and quality gates

The required contract check fails on:

- schema generation diff or nondeterministic output;
- operation parse/validation failure, anonymous operation, duplicate name, or
  document outside its owning Feature;
- missing `__typename` exhaustiveness for a result union;
- unused operation/fragment, cross-Feature fragment, or operation without a
  manifest/Journey owner;
- hand-edited or stale generated output;
- unchecked/incorrect custom-scalar mapping;
- new nullable field/list item without an exact schema-policy exception;
- unexpected enum/union change, parallel alias, generic JSON, or leaked storage
  field;
- query complexity/depth above policy, introspection enabled outside development,
  or resolver/application ownership mismatch;
- HTTP/auth envelope, Not Found indistinguishability, idempotency, pagination,
  media, or Track Point contract failure;
- unredacted token, OTP, Email Address, coordinate, object key, signed URL, or
  idempotency key in logs/evidence.

Contract fixtures intentionally break every class above and assert stable rule
IDs and locations. CI runs schema generation before Mobile generation and both
before builds/tests. Required checks never fetch a remote schema or call live AWS.

## Self-review against normalized inventories

| Inventory | Contract coverage |
| --- | --- |
| Sign Up | request/verify sign-up code, typed validation/rate limits, secure auth envelope, legal links remain configured Mobile URLs |
| Login | request/verify sign-in code, refresh single-flight and one replay |
| Email Change | request/verify change, session revocation outcome and forced reauthentication |
| User Screen | current Owner plus authoritative Owner Contribution read model |
| User Edit | owner update, media prepare/commit/compensation, last-write-wins refetch |
| Settings | signOut only; other settings correctly remain device-owned |
| Dogs List | currentDogs with Archived exclusion and explicit empty/error outcomes |
| Dog Registration | create, exact-name duplicate, partial Birthday, Gender, independent Goals, Avatar workflow; no Breed |
| Dog Edit | dog/update/archive, Active participant prohibition, media removal/replacement |
| Dog Detail | dog plus authoritative contribution/history composition |
| Walk Screen | active/start/append/finish/interrupt, current Dogs, Track Point quality, distinct events, pending Photo workflow |
| Walk History | Completed-only fixed cursor connection, All/one-Dog filter, stable ordering and unavailable rows |
| Walk Detail | whole-detail contract, current references, validated route/events/photos, Active redirect input |

## Self-review against architecture inputs

- PR #366: every resolver maps one application operation; lifecycle, storage,
  pagination, idempotency, media, and provider decisions remain behind ports.
- PR #367: operations are Feature-owned, generated output is transport-only,
  domain mapping is strict, routes do not consume GraphQL, and drift is
  deterministic.
- API kernel: schema generation belongs to `api-bootstrap`; schema/contract gates
  integrate with the compiler-first workspace and Testcontainers harness.
- Mobile kernel: branded generated types remain in adapters, authenticated fetch
  is a Platform capability, and Feature manifests/Journey selection own evidence.
- Normalized behavior: exact duplicate names, partial Birthday, no Breed,
  Completed-only insight, hidden Interrupted Walks, current names, fixed pages,
  unit-independent metrics, permission-driven interruption, unknown-event
  omission, media atomicity, and last-write-wins are preserved.

The first comparison found and corrected one inconsistency: access-token failure
was initially proposed as an operation union member. It is now a shared 401
transport contract so refresh is single-flight and Feature-independent, while
resource authorization remains indistinguishable Not Found. No unresolved
contract decision remains in this ticket.
