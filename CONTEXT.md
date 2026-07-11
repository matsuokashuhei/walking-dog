# Walking Dog

Walking Dog describes the people, dogs, and walks that make better shared walk
experiences possible.

## Language

**Account**:
The login identity authenticated for Walking Dog. An Account owns its Email
Address, authentication challenges, and Authenticated Sessions and corresponds
to exactly one Owner. It does not replace the Owner as the subject of dog care,
walks, or contribution.
_Avoid_: User, Owner when discussing authentication

**Owner**:
A person who registers and cares for one or more Dogs in Walking Dog. An Owner's
display name is trimmed before saving, contains 1–50 user-perceived characters,
and contains no newline or control character; other Unicode characters are
allowed. Each Owner corresponds to exactly one Account.
_Avoid_: User when discussing dog ownership

**Email Address**:
The Account's normalized authentication identity. It is trimmed, lowercased, at
most 254 characters, may contain a `+` alias, and contains neither control
characters nor an invalid email structure.
_Avoid_: Username, unnormalized email

**Authenticated Session**:
A rotating access-token and refresh-token relationship through which an Account
may use Walking Dog. It is authentication state, not part of an Owner or Walk.
_Avoid_: Owner session, Walk session

**Dog**:
A currently registered, non-archived dog cared for by an Owner. An Owner cannot
have two Dogs whose names are the exact same sequence of characters; Archived
Dogs do not reserve names, and case, whitespace, and Unicode-equivalent but
non-identical sequences remain distinct names. A Dog name contains 1–50
user-perceived characters, is not whitespace-only, and contains no newline or
control character; other Unicode characters and surrounding whitespace are
preserved.
_Avoid_: Pet

**Birthday**:
An optional Dog birth value preserving year, year-month, or full-date precision.
Known components must be valid, from 1900 through the API's present, and not
future. Age calculation uses the full date, day 16 for year-month, or July 1 for
year-only; inferred components are not persisted.
_Avoid_: Birth timestamp, persisted approximate date

**Gender**:
A required Dog classification with exactly Male, Female, or Other domain values.
Display labels are localized while API representation is a closed enum.
_Avoid_: Free-form gender string, missing gender

**Archived Dog**:
A Dog removed from the Owner's current Dogs and future Walk selection while its
past Walks, statistics, photos, and events remain part of history. A Dog taking
part in an Active Walk cannot become an Archived Dog.
_Avoid_: Deleted Dog, removed Dog

**Walker**:
The Owner who performs a Walk. Past Walks resolve the Walker's current profile
through the Owner reference rather than preserving a profile snapshot. A missing
or unavailable current profile image is represented by an initial derived from
the current display name.
_Avoid_: Historical walker profile

**Walk**:
An outing performed by one Walker with one or more Dogs, including its time,
route, events, photos, and resulting statistics. Historical participants keep
Dog references and resolve their current names rather than name snapshots;
Archived Dogs therefore expose their final current names.
_Avoid_: Session when referring to the recorded outing

**Completed Walk**:
A Walk the Owner ended successfully. It is the only Walk state eligible for
Owner-visible history, statistics, Walk Goal progress, and Contribution.
_Avoid_: Interrupted Walk, finalized Walk when state matters

**Active Walk**:
The single Walk an Owner is currently recording. While it exists, returning to
its recording controls takes precedence over viewing any past Walk detail.
_Avoid_: Recording session, current trip

**Walk Recording**:
The activity of starting an Active Walk, collecting Track Points and Walk Events,
and finalizing it as Completed or Interrupted. It is not the Walk itself.
_Avoid_: Walk, Authenticated Session

**Track Point**:
A time-stamped location observation accepted for a Walk after its coordinates,
horizontal accuracy, ordering, and implied speed satisfy the Walk's quality
rules. Unvalidated location-provider output is not a Track Point.
_Avoid_: Raw GPS value, location update

**Walk Event**:
A time-stamped Pee, Poop, or Photo occurrence for one participating Dog within
one Walk. Location is optional and, when present, refers to the latest accepted
Track Point. One idempotency identity denotes the same occurrence across retries.
_Avoid_: Track Point, aggregate event count

**Pending Walk Event**:
A Walk Event durably retained on an Owner's device whose API registration is not
complete. For Photo, completion includes media upload.
_Avoid_: Failed event, temporary event

**Pending Photo Event**:
A Pending Walk Event whose kind is Photo. It may remain pending after the Walk
ends and is removed only after synchronization or explicit Owner discard.
_Avoid_: Failed photo, temporary upload

**Interrupted Walk**:
A Walk ended automatically because required foreground location access was lost.
It preserves data internally for diagnostics and pending-event synchronization,
but is hidden from all Owner-facing history and does not count toward completed-
Walk totals, statistics, charts, or Walk Goals.
_Avoid_: Failed Walk, completed Walk

**Walk Goal**:
A time target for one Dog over either a Daily or Weekly cycle. Daily and Weekly
values are independent preferences and are never converted into one another;
zero means the Owner has no active target for that cycle.
_Avoid_: Distance goal, converted daily average

**Walk History**:
The chronological collection of Completed Walks visible to an Owner, optionally
filtered to one current or Archived Dog. It excludes Active and Interrupted
Walks.
_Avoid_: Active Walk list, all persisted Walks

**Contribution**:
An Owner's walking record derived from Completed Walks, including lifetime walk
count, distance, duration, and current-week daily distance. It is not an
independently maintained record.
_Avoid_: Dog Walk Progress, persisted contribution

**Dog Walk Progress**:
Statistics and Walk Goal progress derived from Completed Walks for one Dog. It
does not include the Walk Goal setting itself.
_Avoid_: Contribution, Walk Goal
