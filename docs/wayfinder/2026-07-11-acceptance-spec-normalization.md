# Acceptance Specification Normalization

## Purpose

This document records product decisions that make every item under
`docs/tmp-testcases/` observable and executable. The source files remain the
acceptance inventory. When an inventory statement offers alternatives or asks
to confirm behavior, the decision below is authoritative.

## Global outcomes

- Initial Mobile acceptance is iOS only.
- Every migrated merge keeps main deployable; migrated journeys remain usable.
- Current GraphQL, Mobile source, and runtime compatibility are not required.
- There is no production-data migration.
- Features absent from `docs/tmp-testcases/`, including Watch and Live Activity,
  are not retained for compatibility.
- A cached successful result remains visible when refresh fails. A localized,
  non-blocking update error and Retry are shown. With no cached result, the same
  failure uses a full error screen.
- Invalid, nonexistent, and unauthorized Dog or Walk identifiers produce the
  same localized Not Found screen with Back and no Retry. Transport and
  temporary provider failures produce a separate Retryable error.
- Normal GraphQL operations and foreground-location acquisition time out after
  30 seconds. Image-upload operations time out after 60 seconds. Inputs remain
  available for idempotent retry.
- During an in-flight mutation, repeat submission and Cancel/Back are disabled.
- If a create or edit form is dirty, Cancel/Back requires discard confirmation.
  If a picker or modal is open, Back closes that surface first without losing
  form state.
- A permission that iOS can no longer request presents localized explanation,
  Open Settings, and Cancel actions. A temporary denial presents explanation
  without forcing Settings. This applies to photo library, camera, and location.
- Duplicate identifiers, invalid required values, and response ordering that
  violates the API contract are surfaced as contract errors and observability
  evidence. Mobile does not silently repair provider or API contract violations.

## Owner and authentication

- Owner display names are trimmed before saving, contain 1–50 user-perceived
  characters, and contain no newline or control character. Other Unicode,
  including emoji and RTL text, is allowed. Empty display names cannot be saved.
- An absent or invalid display name received while reading renders as localized
  Unknown User and uses `?` as its avatar initial.
- Authentication Email Addresses are trimmed, lowercased, at most 254
  characters, allow `+` aliases, and reject controls or invalid email structure
  in both Mobile and API.
- OTP is valid for 10 minutes. Resend becomes available after 30 seconds, a
  resend invalidates the earlier code, and one Email Address may request five
  codes per hour. Rate-limit UI shows the next retry time.
- Returning from OTP entry to email entry destroys the challenge/session.
- OTP length is fixed by journey and returned by API: Sign In uses eight ASCII
  digits; Sign Up and Email Change use six. Mobile strips nondigits, truncates
  excess input, and auto-verifies exactly once on first reaching the expected
  length. Failure clears input and permits the same code to be entered again.
  Unexpected `codeLength` is a contract error; API rejects invalid shape before
  invoking Cognito.
- Human-assisted E2E OTP wait is 10 minutes and records `HUMAN_TIMEOUT` rather
  than silently hanging or exposing OTP/session/token values.
- Successful Email Address change makes the new address the only login identity,
  rejects the old address, revokes every session on every device, and requires
  the current device to sign in again with the new address.
- Active Walk and Interrupted Walk finalization states block Sign Out. The Owner
  is directed to the recording controls and must finish before signing out.
- On access-token expiry, concurrent failures share one refresh operation and
  retry once with the original idempotency identity. Invalid refresh state or a
  response missing either required token invalidates the session. Without an
  Active Walk, Mobile returns to Sign In. During an Active Walk, Mobile retains
  local route/events, attempts Interrupted finalization, and stays in an
  authentication-recovery state if that cannot be authorized. No new event may
  be added there; after Sign In, finalization and retained-event sync resume.

## Dog profile

- An Owner cannot have two current Dogs with names that are exactly the same
  character sequence. No case, whitespace, or Unicode normalization is applied
  to uniqueness. Archived Dogs do not reserve names.
- Dog names contain 1–50 user-perceived characters, are not whitespace-only, and
  contain no newline or control character. Other Unicode and surrounding
  whitespace are preserved.
- Birthday is optional and preserves year, year-month, or full-date precision.
  Year is 1900 through the API current year; known components must exist and the
  represented precision cannot be future. Missing components are never stored
  as guessed values. For age calculation only, year-month uses day 16 and
  year-only uses July 1; full dates use their stored day.
- Gender is required and is exactly `MALE`, `FEMALE`, or `OTHER` in the API.
  Mobile localizes labels but sends the enum. Unknown, missing, differently
  cased, or whitespace-padded values are rejected and never rounded to a default.
- Breed is outside this acceptance scope. Its database column remains reserved,
  but Mobile-facing GraphQL operations, domain models, registration, edit,
  detail, list, and acceptance tests do not expose or display it.
- Removing a current Dog archives it. Active Walk participants cannot be
  archived. Archived Dogs leave current lists and future selection while past
  Walks, statistics, events, and photos remain accessible.
- A selected Dog/Owner Avatar makes create or update atomic from the Owner's
  perspective. Upload or database failure leaves no created/changed record,
  compensates orphaned new media, preserves the form and selected image for
  retry, and deletes an old object only after the new reference commits.
- With no changed field or image, Dog and Owner Save is disabled and no API call
  is made. Reverting edits to the initial values disables Save again.
- Dog and Owner edit allow an existing Avatar to be removed after confirmation.
  A successful database update clears the reference before deleting the old
  object. Failure retains the prior Avatar and permits idempotent retry.
- Concurrent Dog and Owner edits use last-write-wins. After mutation, Mobile
  refetches and converges to the server's final state; no merge/conflict UI is
  provided.

## Media boundaries

- Dog and Owner Avatars are square-cropped, normalized to JPEG, no larger than
  1024×1024 and 5 MiB.
- Walk Photos are not cropped, are normalized to JPEG, have a maximum long edge
  of 2048 pixels, and are no larger than 10 MiB.
- Mobile resizes/compresses through temporary files and validates before upload;
  API validates the same media-specific limits. Invalid, undecodable, non-image,
  or oversized input is rejected explicitly.
- Invalid, unavailable, or expired profile images fall back to an initial from
  the current display name. Invalid Walk Photo thumbnails show an explicit
  placeholder/error without exposing object keys or signed URLs.

## Walk lifecycle and history

- Foreground location is required to start and continue a Walk. Start is blocked
  when it is unavailable. Background denial falls back to foreground tracking.
- Losing foreground permission or disabling location services during recording
  automatically ends the Active Walk as an Interrupted Walk.
- An Interrupted Walk preserves time, route, events, and photos internally for
  diagnostics and synchronization, but is absent from every Mobile history,
  detail, Dog, and Me surface. API history pagination excludes it before cursor
  calculation. It never contributes to counts, statistics, charts, Goals, or
  event totals and cannot be resumed or changed to Completed.
- Immediately after interruption, Mobile explains that location loss ended the
  Walk and returns to Ready without opening detail. Pending events sync to the
  hidden Interrupted Walk and are removed locally after success. Until then they
  remain background retry state, not user-visible history.
- While an Active Walk exists, opening any Walk detail route redirects to its
  recording controls, even when the requested identifier names a past Walk.
- A completed Walk requires `endedAt`, `startedAt <= endedAt`, and
  `endedAt <= API clock now`. Duration is computed by API and cannot be negative.
  Invalid read-model data fails rather than receiving a Mobile fallback.
- API rejects any `startedAt`, `endedAt`, event `occurredAt`, or track-point
  timestamp later than its receive-time clock, with no skew allowance. The
  enclosing write fails validation. Future-dated read data is omitted from
  aggregates and logged as a contract violation; a detail view that depends on
  it fails rather than clamping or substituting the current time.
- History is ordered by `startedAt` descending and `walkId` descending for ties.
  Events are ordered by `occurredAt` ascending and `eventId` ascending for ties.
  API guarantees order; Mobile preserves it.
- Past Walks resolve the Walker's current display name and current image instead
  of storing a profile snapshot. An unavailable image falls back to an initial
  from the current display name.
- Past Walks also resolve each participating Dog's current name by `dogId`, with
  no Dog-name snapshot. Renaming changes past displays. Archived Dogs retain the
  reference and expose their final current name; filters always use `dogId`.
- Walk History is reachable from Me for all Dogs and from Dog detail with that
  Dog preselected. Filters are All Dogs or one current/archived Dog; no date or
  Walker filters are included.
- Completed Walks appear; Active and Interrupted Walks do not. A multi-Dog Walk
  appears once under All Dogs and in every participating Dog filter.
- Returning to Walk History preserves filter and scroll position.
- History uses fixed 20-item cursor pages. Mobile cannot choose another page
  size. Repeated bottom events do not duplicate a request, and cyclic/invalid
  cursors fail visibly rather than looping.
- Completed Walk `distanceM` and `durationSec` are non-null, finite, and
  nonnegative; duration is an integer. Null, negative, nonfinite, or malformed
  values never become zero. A bad history row renders Walk data unavailable
  while other rows remain; detail fails as a contract error; affected Owner/Dog
  aggregates render Unavailable with Retry. Explicit zero remains valid.
- A Pending Photo Event is persisted on device immediately, uses one idempotency
  identity until upload and registration succeed, may outlive Walk completion,
  remains visibly pending, and is removed only after sync or explicit discard.
- Finishing a Walk does not wait for Pending Photo Events. They continue syncing
  after completion and appear as pending in history/detail until success. A
  permanent failure is retained for explicit Retry or confirmed discard.
- Each intentional Pee or Poop tap creates a distinct event. Its button is
  disabled while that submission is in flight; a retry reuses the same
  idempotency identity. A tap after completion creates another event, with no
  time-window deduplication.
- API exposes Pee, Poop, and Photo event types. Unknown read events are ignored
  by Mobile in timeline, map, counts, and aggregates; only a privacy-safe
  contract-violation count is recorded. Unknown writes are impossible in Mobile
  and rejected by API.
- An event `occurredAt` must be within its Walk: at or after `startedAt`, and for
  a finalized Walk at or before `endedAt`. New online events target only Active
  Walks. An event durably created while offline may sync after completion with
  its original time and idempotency identity, provided it remains within the
  finalized boundary. Existing out-of-bound events are ignored in UI, map,
  counts, and aggregates and recorded as privacy-safe contract violations.
- A route point is accepted only when horizontal accuracy is at most 50 metres,
  its timestamp is later than the previous accepted point, and its implied speed
  is at most 12 m/s. Rejected points affect neither route nor distance. If no
  acceptable point arrives for 30 seconds, the Walk ends as Interrupted.
- On startup, sign-in, and foreground return, API Active Walk state is
  authoritative. If API has an Active Walk and Mobile has no local state, Mobile
  restores its Dogs, start time, submitted events, and route, enters recording,
  and resumes location when permitted. Failure to regain valid location within
  30 seconds ends it as Interrupted; device-only state that no longer exists
  cannot be restored.
- If Mobile has local Active Walk state but API does not, location recording
  stops immediately. Mobile shows the API's Completed/Interrupted state when the
  Walk exists. If it does not exist, Mobile discards the active shell and shows
  an error. Unsubmitted events are retained: they retry only when the target Walk
  exists, otherwise remain explicitly unrecoverable until confirmed discard.
  Mobile never creates a Walk from orphaned local Active Walk state.

## Settings

- Language supports Japanese and English; Units supports kilometers and miles;
  Appearance supports Light, Dark, and Auto. Selection applies immediately and
  persists; failed persistence restores the prior visible value and reports an
  error.
- Units affect active distance/pace, history, Walk detail, Dog statistics, and Me
  aggregates consistently. API returns canonical metric values; Mobile formats
  the selected unit.
- Notifications reflects iOS permission as Not Requested, On, or Off. Tapping
  opens the Walking Dog notification settings; returning refreshes the value.
  There is no separate in-app notification preference or notification-delivery
  feature in this scope.
- About is a read-only row displaying real app version and build number. It has
  no chevron, tap action, or separate About screen.
- Terms opens `/terms`; Privacy opens `/policy`. Open/offline failures produce a
  localized error and leave Settings usable.

## Goal and profile presentation

- Walk Goals retain independent Daily and Weekly values. Switching cycles never
  converts one value into the other and restores the last value set for the
  selected cycle.
- Defaults are Daily 30 minutes and Weekly 120 minutes. Daily permits 0–120 and
  Weekly permits 0–840, both in five-minute steps. Zero means no goal.
- A valid Owner `createdAt` renders Walking Since using the device locale and
  local-timezone month. Missing, invalid, or future values render `Walking since
  --`, record a contract violation, and do not fail the rest of the screen.
- Daily and weekly boundaries use the device's current timezone at display time;
  a week is Monday 00:00 through the next Monday. A completed Walk belongs wholly
  to the local day/week of `startedAt`, even across midnight. Active and
  Interrupted Walks do not contribute to lifetime totals, charts, or Goals.
  Multi-Dog Walks count once for Owner totals and once for every participating
  Dog. Goal comparisons use summed unrounded seconds; formatting rounds only
  after aggregation. A timezone change may reclassify past Walks.

## Human-visible evidence

- Success, failure, retry, permission, empty, loading, accessibility, theme,
  language, and unit outcomes named by each source file remain mandatory.
- Evidence must not contain OTPs, challenge/session values, access/refresh
  tokens, private storage keys, signed URLs, precise location beyond the minimum
  deterministic fixture proof, or unnecessary personal data.
- Product values, API fixtures, ordered identifiers, pageInfo/cursors, database
  state, queue/storage effects, and UI output are compared rather than inferred
  from screenshots alone.

## Input coverage

| Acceptance inventory | Normalized outcome areas |
| --- | --- |
| `signup-e2e-test-cases.md` | Email, OTP, legal links, timeout, evidence secrecy |
| `login-screen-e2e-test-cases.md` | Email, OTP, refresh, authenticated destination |
| `email-change-screen-e2e-test-cases.md` | Email identity replacement, OTP, global session revocation |
| `user-screen-e2e-test-cases.md` | Current profile, Walking Since, totals, weekly boundaries, units |
| `user-edit-screen-e2e-test-cases.md` | Name, Avatar atomicity/removal, dirty forms, last-write-wins |
| `settings-screen-e2e-test-cases.md` | Language, units, appearance, notification permission, legal, About, Sign Out |
| `dogs-list-e2e-test-cases.md` | Current Dogs, cache/error distinction, identity, images, archived exclusion |
| `dog-registration-e2e-test-cases.md` | Name uniqueness, Gender, partial Birthday, independent Goals, media atomicity |
| `dog-edit-screen-e2e-test-cases.md` | Not Found, no-change save, archive, partial Birthday, media removal |
| `dog-detail-screen-e2e-test-cases.md` | Current Dog data, calculated age, Completed-only statistics/Goal/history |
| `walk-screen-e2e-test-cases.md` | selection, location, route quality, events, offline media, recovery, finish |
| `walk-history-list-e2e-test-cases.md` | Completed-only filtering, ordering, pagination, archived Dog references |
| `walk-detail-screen-e2e-test-cases.md` | lifecycle precedence, route/event validation, current references, media |

## Normalization status

All identified decision points are resolved. Source acceptance statements that
conflict with these outcomes are superseded and must be rewritten when promoted
into executable journeys. In particular, this applies to Breed UI/API behavior,
Daily/Weekly conversion, Interrupted Walk history visibility, Dog-name snapshots,
null distance/duration becoming zero, unconfirmed dirty-form discard, unchanged
Save submission, and current-implementation fallback behavior.
