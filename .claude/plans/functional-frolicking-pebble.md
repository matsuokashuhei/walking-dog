# Modularity Review — `apps/api/` (Rust / Axum / async-graphql / SeaORM)

## Context

This is a modularity review produced by `/modularity:review` on the `apps/api/` Rust service of the walking-dog monorepo. The analysis applies Vlad Khononov's Balanced Coupling model — `BALANCE = (STRENGTH XOR DISTANCE) OR NOT VOLATILITY` — to the integration points inside the API.

Why this review now:
- The solo dev has signaled that the **散歩データの豊富化** area (`walk`, `walk_events`, `walk_points`, `stats`) is the hot spot for the next 3–6 months.
- Unbalanced, high-volatility couplings in that area will turn every future feature into shotgun surgery.
- No specific pain points are known yet, so this review is proactive: surface the couplings that will hurt *if* the hot area expands as planned.

Plan mode note: this file is the only artifact I'm allowed to write. If the user approves, I'll export the same content as a standalone Markdown + HTML review in a follow-up turn (that's what the `modularity:review` skill's `document` step normally produces).

## Scope & Method

- **Scope**: `apps/api/src/**` + `apps/api/tests/**` references (read-only).
- **Excluded**: `apps/api/migration/` (schema DSL only); `apps/api/target/`.
- **Method**: Read all services, resolvers, entities, auth, error. Traced cross-module calls and shared types. No git-history mining — volatility is judged from domain classification and the user's stated roadmap, not commit churn.

## Organizational & Distance Context

- **Team**: solo developer.
- **Deployment**: single Rust binary (Axum monolith) behind Cognito / Postgres / DynamoDB / S3.
- **Repo**: single monorepo; weekend-only dev env.
- **Implication**: **effective distance is uniformly low** across the whole API. The balance rule therefore collapses to STRENGTH vs VOLATILITY: high strength + high volatility is where pain concentrates. No "microservice split" posture to preserve, no team ownership boundaries to respect.

## Domain Classification (validated with user)

| Class | Areas | Volatility (6-mo) |
|---|---|---|
| **Core** | `walk_service`, `walk_event_service`, `walk_points_service`, stats (`dogWalkStats`), resolvers composing `WalkOutput` | **HIGH** (user-confirmed hot area) |
| **Core** | `encounter_service`, `friendship_service` | MEDIUM (core to product vision, not this quarter) |
| **Supporting** | `dog_service`, `dog_member_service`, `dog_invitation_service`, `user_service` | LOW–MEDIUM |
| **Generic** | `auth/` (Cognito wrapper), `s3_service`, `aws/` clients, `db/`, `error` | LOW (generic subdomains, stable providers) |

## Integration Map (Summary)

Cross-module edges with shared knowledge:

```
graphql/mutations/{walk,auth,dog,encounter,walk_event,dog_member,photo}
  │
  ├─▶ graphql/auth_helpers  ──▶ auth::require_auth
  │                           ─▶ user_service
  │                           ─▶ dog_member_service
  │                           ─▶ walk_event_service::require_walk_access
  │
  ├─▶ services/*                (functional — service API)
  │     ├─ walk_service        ──▶ entities::{walks, walk_dogs, dog_members}
  │     ├─ walk_event_service  ──▶ dog_member_service
  │     │                       ─▶ entities::{walks, walk_events, walk_dogs, users, dog_members}
  │     ├─ encounter_service   ──▶ walk_event_service::verify_encounter_detection
  │     │                       ─▶ walk_event_service::verify_counterparty_encounter_detection
  │     │                       ─▶ friendship_service::upsert_friendship / update_friendship_duration
  │     ├─ friendship_service  ──▶ entities::friendships
  │     ├─ dog_service         ──▶ dog_member_service (pass-through)
  │     └─ dog_invitation      ──▶ dog_member_service::add_member / require_dog_member
  │
  └─▶ entities::* direct (!)  — resolvers for WalkOutput.{dogs,events,points,walker},
                                 EncounterOutput.{dog1,dog2}, FriendshipOutput.friend,
                                 UserOutput.dogs, and add_walk_points_field's ownership check
                                 query entities/ directly, bypassing services.
```

The **red flag** is the last arrow: presentation-layer resolvers reaching into `entities/` directly. Everything else follows a clean `resolver → auth_helper → service → entity` shape.

## Flagged Issues

Prioritized by `(STRENGTH × VOLATILITY)` with distance held low.

---

### H1 — GraphQL output types hold direct entity / Dynamo knowledge

**Strength**: Intrusive/Model. **Distance**: Low. **Volatility**: HIGH. **Balance**: Unbalanced on the hot area.

**Where**:
- `apps/api/src/graphql/mutations/walk.rs:141–225` — `WalkOutput.dogs`, `WalkOutput.points`, `WalkOutput.events` field resolvers call `WalkDogEntity::find`, `DogEntity::find`, `walk_points_service::get_walk_points`, `walk_event_service::list_events` inline. `WalkOutput.walker` (line 119–139) does `UserEntity::find_by_id` directly.
- `apps/api/src/graphql/custom_queries.rs:207–238` — `EncounterOutput.dog1` / `dog2` fetch `DogEntity::find_by_id` directly.
- `apps/api/src/graphql/custom_queries.rs:293–317` — `FriendshipOutput.friend` does the same.
- `apps/api/src/graphql/mutations/auth.rs:93–133` — `UserOutput.dogs` calls `dog_service::get_dogs_by_user_id` **and** `DogMemberEntity::find` separately to stitch role onto the output. Two queries where one service call could return the pair.
- `apps/api/src/graphql/mutations/walk.rs:394–401` — `add_walk_points_field` inlines `WalkEntity::find_by_id().filter(UserId.eq(user.id))` as an ad-hoc ownership check, duplicating what `walk_event_service::require_walk_access` or a `walk_service::require_walk_owner` could centralize.

**Why it matters**: The GraphQL schema is the presentation layer. It currently shares **implementation knowledge** (entity column names, SeaORM filter DSL, cross-store fan-out) with the service layer. Because the walk area is the volatility hot spot, every enrichment — e.g. adding `walk.speedMps`, row-level visibility, an N+1-fixing DataLoader, a photo CDN rewrite — will require synchronized edits in *both* the service and the field resolver. This is classic shotgun surgery on the volatile path.

**Recommendation**:
- Introduce an aggregate fetch in `walk_service`, e.g. `get_walk_detail(db, walk_id) -> WalkDetail { walk, dogs, walker, points, events }`. The `WalkOutput` resolver marshals the struct into GraphQL; no inline queries.
- Similarly, `user_service::get_user_with_dog_memberships(user_id) -> (User, Vec<(Dog, Role)>)` would remove the two-query stitch in `UserOutput.dogs`.
- For encounter/friendship: `dog_service::get_dog_by_id` is already the right shape — call it from resolvers instead of `DogEntity::find_by_id`.
- When DataLoader becomes necessary, it lives in the service boundary, not in every resolver.

---

### H2 — Walk points cross-datastore contract is implicit

**Strength**: Implicit model coupling (key schema convention). **Distance**: Low but crosses infrastructure. **Volatility**: HIGH.

**Where**:
- `apps/api/src/services/walk_points_service.rs:42, 84` — the DynamoDB partition key is constructed inline as `format!("WALK#{}", walk_id)`, sort key as `format!("PT#{}", recorded_at)`. No type wraps the key schema. Consumers of `get_walk_points` assume the walk exists in Postgres; there's no referential check, no cleanup path when a walk is deleted, and no transaction spanning both stores.
- `walks` records in Postgres have `distance_m` and `duration_sec` as aggregated scalars; the raw point series is fire-and-forget Dynamo data. If a point insert fails, `walks` has no way to know.

**Why it matters**: As the hot area grows (pace, elevation, heart rate, battery-saver sub-sampling, rewind-for-replay), more features will cross this boundary. Each feature re-discovers the key schema and the "no transactions" caveat. Worse, the implicit contract is invisible to new contributors — they'll learn it by shipping a bug.

**Recommendation**:
- Introduce a `WalkPointsStore` trait (or a module-private key builder) that owns the Dynamo key format. Services interact through that trait, not raw `AttributeValue`.
- Document and enforce the "points are best-effort side data; walk aggregates are the source of truth" rule — ideally with a test that asserts `walks.duration_sec` / `distance_m` are populated at `finish_walk` regardless of Dynamo state.
- Consider adding a point-count or checksum column on `walks` so that downstream consumers can detect incomplete uploads without cross-store queries.

---

### H3 — `WalkPointOutput` is registered as two GraphQL types with different names

**Strength**: Model (type-name divergence). **Distance**: Low. **Volatility**: HIGH.

**Where**:
- `apps/api/src/graphql/custom_queries.rs:107–139` — `walk_point_type()` registers `Object::new("WalkPoint")`. The root `walkPoints` query returns `[WalkPoint!]!`.
- `apps/api/src/graphql/mutations/walk.rs:228–266` — `walk_point_output_type()` registers `Object::new("WalkPointOutput")`. `WalkOutput.points` returns `[WalkPointOutput!]!`.
- Both objects downcast from the same Rust struct (`crate::graphql::custom_queries::WalkPointOutput`).

**Why it matters**: The GraphQL API exposes two differently-named types for the same data. Clients either duplicate fragments or pick one arbitrarily. Any new field (altitude, speed, accuracy) must be added in two places and tested for schema coherence. Given walk data is the growth area, this will hurt soon.

**Recommendation**: Pick one name (probably `WalkPoint` — shorter and matches the service struct), delete the other `Object::new` registration, and update the `register()` call list in `graphql/mod.rs:77`. Mobile schema regeneration picks it up.

---

### M1 — Encounter-specific authorization lives inside `walk_event_service`

**Strength**: Functional (service-to-service), but semantic boundary is wrong. **Distance**: Low. **Volatility**: MEDIUM (core domain; moves when encounter detection product rules evolve).

**Where**:
- `apps/api/src/services/walk_event_service.rs:72–103` — `verify_encounter_detection` (ownership + `encounter_detection_enabled` flag).
- `apps/api/src/services/walk_event_service.rs:113–158` — `verify_counterparty_encounter_detection` (fans out to `dog_members` → `users` to check the opt-out flag on the other side).
- Both are called only from `encounter_service::{record_encounter, update_encounter_duration}`. They are not used by any walk-event resolver.

**Why it matters**: The module placement lies about what `walk_event_service` is responsible for. When the encounter-detection rules change (age gating, region rules, mutual-consent tiers), a developer grepping for "encounter" in `encounter_service` won't find the authorization logic. The `encounter_service` then re-implements parts of it, or misses an update — a silent drift.

**Recommendation**: Move both functions into `encounter_service` (or a new `encounter_authorization` submodule under `services/encounter/`). The only shared dependency is `entities::{walks, users, dog_members, walk_dogs}`, which `encounter_service` already imports.

---

### M2 — Dog-pair ordering is an implicit invariant, duplicated across services

**Strength**: Intrusive (every caller must pre-normalize). **Distance**: Crosses services. **Volatility**: MEDIUM.

**Where**:
- `apps/api/src/services/encounter_service.rs:21–29` — `normalize_dog_pair(a, b) -> Option<(Uuid, Uuid)>` private helper.
- `apps/api/src/services/friendship_service.rs:15–21` — `upsert_friendship` comment: *"dog_id_1 MUST be < dog_id_2 (normalized by caller)"*. No type enforcement.
- `apps/api/src/services/friendship_service.rs:102–115` — `get_friendship` re-implements the ordering inline instead of reusing the helper. The two functions will drift when the rule changes.

**Why it matters**: This is a cross-service invariant enforced by comments and discipline. New code paths (batch backfill, admin tools, BLE-mesh reconstruction) will quietly violate it and produce duplicate friendship rows, because nothing in the type system says the pair is ordered.

**Recommendation**:
- Introduce `DogPair(Uuid, Uuid)` in `services/dog_pair.rs` with a constructor that sorts. `From<(Uuid, Uuid)> for Option<DogPair>` returns `None` for same-dog input.
- `friendships` and `encounters` services take `DogPair` in their signatures. The call site that builds a pair is the only place that needs to think about ordering.

---

### M3 — GraphQL enums are re-declared instead of derived from domain enums

**Strength**: Model. **Distance**: Low. **Volatility**: MEDIUM (HIGH for `WalkEventType` because new event types are on the roadmap).

**Where**:
- `apps/api/src/graphql/mod.rs:11–33` — `walk_status_enum()` (`ACTIVE`/`FINISHED`), `walk_event_type_enum()` (`PEE`/`POO`/`PHOTO`), `period_enum()` (`WEEK`/`MONTH`/`YEAR`/`ALL`).
- `apps/api/src/entities/walks.rs:10–15` — `WalkStatus::{Active, Finished}` with `string_value = "active"` / `"finished"`.
- `apps/api/src/services/walk_event_service.rs:24–54` — `WalkEventType` with `"pee"`, `"poo"`, `"photo"`.
- `apps/api/src/services/walk_service.rs:22–66` — `Period` with title-case strings (`"Week"`, `"Month"`, etc.).

Three different casings in play (UPPER / lower / Title) across three representations of the same three concepts. The GraphQL and the service/entity enums are coupled by **parallel maintenance** — adding a variant requires editing all of them, plus the `FromStr` impl, plus any tests, with no compile-time link.

**Why it matters**: In the hot walk area, new `WalkEventType` variants are likely (`water`, `treat`, `play`, `rest`). Each addition is a 5-place edit today. Miss one and the schema is out of sync with the service.

**Recommendation**:
- Add a single source of truth (preferably the entity/service enum). Provide a `graphql_enum()` conversion function (or a small macro) that produces the `async_graphql::dynamic::Enum` from the domain enum.
- Alternatively, add a compile-time assertion test in `graphql/mod.rs` tests that iterates domain-enum variants and asserts each appears in the GraphQL enum.

---

### L1 — Walk-ownership check is inlined in one mutation, delegated in others

**Strength**: Model (inline SQL at the resolver). **Distance**: Low. **Volatility**: HIGH (same hot area).

**Where**:
- `apps/api/src/graphql/mutations/walk.rs:394–401` (`add_walk_points_field`) inlines `WalkEntity::find_by_id(walk_id).filter(walks::Column::UserId.eq(user.id))`.
- `finish_walk_field` delegates to `walk_service::finish_walk`, which filters internally.
- `start_walk_field` does multi-dog membership check inline.
- `walk_event_service::require_walk_access` uses ownership OR membership (broader).

So there are **three different walk authorization semantics** scattered across walk mutations. Extending the model (e.g., shared walks readable by all members, writable only by owner; or admin-assist access) requires hunting every variant.

**Recommendation**: Add `walk_service::require_walk_owner(db, walk_id, user.id) -> Result<Walk, AppError>` and use it from `add_walk_points_field` + any future "owner-only" walk mutations. Keep `walk_event_service::require_walk_access` as the read-side helper. Name the distinction in the function names so the intent is obvious.

---

### L2 — `dog_service::get_dogs_by_user_id` is a pure pass-through

**Strength**: Contract. **Distance**: Low. **Volatility**: LOW.

**Where**:
- `apps/api/src/services/dog_service.rs:74–79` — single line `dog_member_service::get_dogs_by_member(db, user_id).await`.

**Recommendation**: Either inline the call or delete the wrapper. Minor; flag while you're touching `dog_service` for H1.

---

### L3 — Seaography is a cost without the benefit

**Strength**: Framework contract. **Distance**: Low. **Volatility**: LOW.

**Where**:
- `apps/api/src/entities/mod.rs:16–20` — `register_entity_modules(builder)` returns the builder unchanged, with the comment *"Seaography auto-generated queries are disabled to prevent data exposure"*.
- `apps/api/src/graphql/mod.rs:46–49` — the framework is still used to scaffold `builder.query` / `builder.mutation`, and `register()` plumbing.

The security reasoning is sound. But the framework is carried as a dependency (`seaography`, `async-graphql`'s `dynamic-schema` feature) without providing its main value proposition (auto CRUD). Long-term, the team pays the upgrade tax on a library whose killer feature is intentionally disabled.

**Not flagged as an issue**, but worth raising for an architectural decision log: *"Do we eventually replace Seaography with vanilla async-graphql dynamic schema?"* Low priority; parked.

---

## Priority-Ordered Action List

1. **H3 first** (30 min): Delete the duplicate `WalkPointOutput` registration, pick one name. Small, low-risk, unblocks later walk schema changes.
2. **H1 next** (1–2 days): Introduce `walk_service::get_walk_detail` and `user_service::get_user_with_dog_memberships`. Refactor `WalkOutput.{dogs,events,points,walker}` and `UserOutput.dogs` to marshal, not query. Replicate for `EncounterOutput.{dog1,dog2}` / `FriendshipOutput.friend` using `dog_service::get_dog_by_id`. This is the biggest single win for the hot area.
3. **H2** (0.5 day): Add a `WalkPointsStore` trait abstracting the key schema; document the cross-store consistency contract with a test.
4. **L1** (30 min): Add `walk_service::require_walk_owner`; replace the inline filter in `add_walk_points_field`.
5. **M3** (0.5 day): Add a `graphql_enum()` helper or a cross-enum consistency test so new `WalkEventType` variants can't ship half-done.
6. **M1** (30 min): Move `verify_encounter_detection*` into `encounter_service`.
7. **M2** (0.5 day): Introduce `DogPair` newtype when `encounter_service` / `friendship_service` next see changes.
8. **L2** (5 min): Delete the `dog_service::get_dogs_by_user_id` pass-through while you're in that file.
9. **L3**: Park as an ADR question; revisit on next major async-graphql bump.

## Critical Files to Touch (by action item)

- `apps/api/src/graphql/mutations/walk.rs` — H1, H3, L1
- `apps/api/src/graphql/custom_queries.rs` — H1
- `apps/api/src/graphql/mutations/auth.rs` — H1
- `apps/api/src/graphql/mod.rs` — H3, M3
- `apps/api/src/services/walk_service.rs` — H1 (new `get_walk_detail`, `require_walk_owner`)
- `apps/api/src/services/user_service.rs` — H1 (new `get_user_with_dog_memberships`)
- `apps/api/src/services/walk_points_service.rs` — H2
- `apps/api/src/services/walk_event_service.rs` — M1 (move out encounter auth)
- `apps/api/src/services/encounter_service.rs` — M1 (receive encounter auth), M2
- `apps/api/src/services/friendship_service.rs` — M2
- `apps/api/src/services/dog_service.rs` — L2 + H1 (already owns `get_dog_by_id`)
- `apps/api/src/services/mod.rs` — if `DogPair` lands as its own submodule

## Verification

To act on this review end-to-end:

1. **Run existing tests first** (clean baseline):
   ```bash
   docker compose -f apps/compose.yml run --rm api cargo test --features test-utils -- --test-threads=1
   ```
   `tests/test_review_fixes.rs` already encodes prior authorization-boundary reviews; don't regress.
2. **Per action item**, apply the change, re-run tests. Expect green.
3. **For H1 and H3**, regenerate the mobile GraphQL schema (`apps/mobile/` codegen) and verify the mobile build doesn't break.
4. **For H2**, add a new test: `tests/test_walk.rs` — assert that `finish_walk` produces `distance_m` / `duration_sec` even when Dynamo is unavailable (inject a failing Dynamo client via existing `test-utils` patterns).
5. **For M3**, add a compile-time style test in `graphql/mod.rs::tests` that iterates the domain enum and checks each variant exists in the GraphQL enum.

## Issues NOT flagged (intentional)

- **Dynamic async-graphql boilerplate** — the `Field::new(...).field(Field::new(...))` pattern is verbose but doesn't create coupling. It's cost, not coupling.
- **Sentry integration spread across `main.rs`, `lib.rs`, `auth/mod.rs`, `error.rs`** — cross-cutting by design; that's how the library expects to be wired.
- **Entity files being codegen** — SeaORM codegen is a generic-subdomain tool; regen is cheap.
- **Test static-guard pattern** (`include_str!` assertions on source text) — unusual but documented and useful; not a coupling concern.

## Next step (with user approval)

After `ExitPlanMode`, per the `modularity:review` skill's `document` phase, I can also produce this review as:
- A standalone Markdown file at `docs/specs/YYYY-MM-DD-modularity-review-apps-api.md`
- A rendered HTML sibling for sharing outside the repo

Only if the user wants those separate artifacts — otherwise this plan file is the deliverable.
