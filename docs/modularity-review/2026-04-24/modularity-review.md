# Modularity Review

**Scope**: `apps/api/` — Rust/Axum + Seaography (async-graphql) GraphQL API on PostgreSQL (SeaORM) + DynamoDB (walk points) + S3 (photos) + Cognito (identity)
**Date**: 2026-04-24

---

## Executive Summary

`apps/api` is the backend for a dog-walking product whose differentiators are **GPS-recorded walks** and **BLE-detected dog-to-dog encounters that aggregate into friendships**. Eight modularity findings remain after the PR #138 cleanup; none are *Critical* under the [Balanced Coupling](https://coupling.dev/posts/core-concepts/balance/) criteria because the entire API is one Rust binary owned by one developer, so [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is uniformly low and the worst-case "high strength + high distance + high [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/)" combination cannot occur within the API itself. The most important finding is **H1**: `auth/jwt.rs` duplicates env-reading rules that `Config` already centralizes, undoing the abstraction the trait-based `JwtVerifier` was designed to enable. The four *Significant* issues all share one shape — **[implicit coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/)** that hides an integration point a future change will trip over.

A second-order observation: while distance inside `apps/api` is low, **distance re-asserts itself at the mobile/API GraphQL contract boundary** (separate codebase, separate deploy cadence, separate platform). H2 (SeaORM model leakage into output types) and M4 (Cognito-specific field in public schema) both have effects there — schema reshapes become socio-technical events, not local refactors.

---

## Coupling Overview Table

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
|---|---|---|---|---|
| `auth/jwt.rs` ⇄ env vars (and indirectly `config.rs`) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (duplicated env-reading rule) | Low (same crate) | Medium | **No** — implicit, duplicated |
| `services/*` → GraphQL `*Output` types (via SeaORM `Model`) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (shape duplicated) | Low (inside crate); **Medium at the mobile API contract** | High (core domain) | **No** — domain model is implicit |
| GraphQL field resolvers → entity-by-id services (loops) | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (singular semantics in many-lookup context) | Low | High (query shapes evolve) | Tolerable today; documented as a *Quality observation* below |
| Resolvers → `walk_points_service` (passing `table_name`) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (callers know which `Config` field) | Low | Low | **No** — module advertises encapsulation it does not deliver |
| `mutations/` → `mutations/` cross-imports for `*Output` (used by queries) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low (cross-intent module) | High | **No** — low cohesion |
| `dog_member_service` ⇄ string literal `"owner"`/`"member"` (5+ sites) | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (stringly-typed enum) | Low | Low | **No** but tolerable; failure mode is silent typo |
| GraphQL `UserOutput.cognitoSub` → public clients | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (IdP detail in public contract) | **Medium** at the mobile/E2E boundary | High (provider-strategic) | **No** — leaks generic-subdomain detail |
| `custom_queries.rs::walk_by_id_field` → `entities::walks::Entity` (direct) | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (one-off bypass) | Low | Low | Tolerable but inconsistent |
| GraphQL inputs → resolvers (inline `try_get`/`string()` parsing) | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (schema decl + parse code agree implicitly) | Low | Medium | **No** — typos compile |
| `encounter_service` → `friendship_service` (transactional side effect) | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Medium | **Yes** — *essential* coupling, friendship is the aggregate of encounters |
| Services → `entities::*` (SeaORM models) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Mixed | Acceptable; the boundary is the only DB seam |
| `error.rs` → GraphQL ([Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) via `into_graphql_error`) | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Low | **Yes** — clean anti-corruption layer |
| `DogPair` newtype → `encounter_service` / `friendship_service` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (invariant-enforcing newtype) | Low | Medium | **Yes** — textbook abstraction |

---

## Domain Classification

| Subdomain | Classification | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | Notes |
|---|---|---|---|
| Encounter detection + friendship aggregation | [**Core**](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | High | BLE-driven dog-to-dog encounters; the unique product feature. Recently moved encounter auth into the service. |
| Walk lifecycle + GPS recording | [**Core**](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | High | iOS 26 Liquid Glass walk-recording flow shipped in PR #134; mobile UI evolves quickly. |
| Walk events (pee/poo/photo) | **Supporting** | Medium | Adding event types is the most likely change. |
| Dog membership / family sharing | **Supporting** | Medium | Recently shipped; role model may grow. |
| Dog profile management | **Supporting** | Low-Medium | CRUD over fixed shape. |
| Identity (Cognito sync) | **Generic** | Low (impl), Medium (provider) | Replaceable. |
| Photo storage (S3) | **Generic** | Low | Pure infrastructure adapter. |
| GPS point storage (DynamoDB) | **Generic** | Low | Pure infrastructure adapter. |

---

## Issue: JWT verifier reads `std::env::var` directly, bypassing `Config`

**Integration**: `auth/jwt.rs` -> environment variables (and indirectly `config.rs`)
**Severity**: **Significant**

### Knowledge Leakage

The Cognito JWT verifier (`apps/api/src/auth/jwt.rs:35-36`, `:39`, `:67`) reads three env vars by name — `COGNITO_USER_POOL_ID`, `AWS_REGION`, `COGNITO_ENDPOINT_URL` — and encodes a domain rule alongside: *"if `COGNITO_ENDPOINT_URL` is set, skip issuer validation (we are running cognito-local)"*. `config.rs` already loads the same three values into `Config` and stores them in `AppState.config`. The env-var **names**, the **default region fallback**, and the **issuer-validation rule** are duplicated knowledge living in two places — the very [implicit coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) the `Config` abstraction was supposed to eliminate.

### Complexity Impact

A reader of `Config` cannot tell that `COGNITO_ENDPOINT_URL` controls issuer-validation behavior — that rule is invisible from `config.rs`. A reader of `jwt.rs` cannot tell that the vars are also loaded elsewhere. The `JwtVerifier` trait was introduced for testability (the `NoOpJwtVerifier` injects in integration tests), but `CognitoJwtVerifier` is not configurable — only its *replacement* is. This violates the trait's reason for existing.

### Cascading Changes

Any change to Cognito wiring — adding multi-region support, switching endpoint resolution, introducing per-environment overrides — must edit two files in lockstep, with no compiler help to ensure both are consistent. The recent `cognito-local` workaround already shows this churn pattern; the next provider/region/staging change will hit the same wall.

### Recommended Improvement

Make `CognitoJwtVerifier` hold its config:

```rust
pub struct CognitoJwtVerifier {
    pub user_pool_id: String,
    pub region: String,
    pub endpoint_url: Option<String>,
}
```

Construct it in `main.rs` from `&Config`. Move the JWKS-URL builder and the issuer-validation rule onto methods of the struct. After the change, `jwt.rs` reads zero env vars; `Config::from_env` is the only place that does. This is a [contract-coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) refactor — `CognitoJwtVerifier` consumes `Config` via fields, not via implicit env names.

**Trade-off:** Adds three fields to one struct and one constructor call in `main.rs`. Negligible cost; restores the abstraction.

---

## Issue: SeaORM `Model` types leak across every service boundary

**Integration**: `services/*` -> GraphQL `*Output` types -> client schema
**Severity**: **Significant**

### Knowledge Leakage

Every public service function returns a SeaORM `Model` directly: `DogModel`, `WalkModel`, `EncounterModel`, `FriendshipModel`, `WalkEventModel`, `UserModel`, `DogMemberModel`. The corresponding GraphQL `*Output` types (`mutations/walk.rs:15`, `mutations/dog.rs:80`, etc.) duplicate the field list — same shape, different name. The "domain model" has no canonical Rust representation; it is **smeared** across the SeaORM entity, the GraphQL output struct, and inline computations in field resolvers. This is implicit [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) on a [core subdomain](https://coupling.dev/posts/dimensions-of-coupling/volatility/).

### Complexity Impact

The `From<Model>` impl localizes the wiring to one site, so the *visible* cost today is bearable. The hidden cost surfaces when GraphQL needs to expose a derived field that isn't a column — `walk.duration_seconds` from `started_at`/`finished_at`, encounter counts, etc. The leaky abstraction forces a choice between (a) computing in the resolver (encapsulation broken; calculation duplicated for multiple consumers) or (b) extending the SeaORM `Model` with non-persisted fields (ORM anti-pattern). Both have already been chosen ad-hoc in the resolvers. Cognitive cost: a reader must scan three files to know *what a Walk is*.

Distance is low *inside* `apps/api`, but the same model leaks out to mobile via the GraphQL schema — and there [distance reasserts itself](https://coupling.dev/posts/dimensions-of-coupling/distance/): mobile is a separate deploy on a separate cadence, so reshaping `WalkOutput` becomes a socio-technical event.

### Cascading Changes

Every column rename, addition, or type change on a core entity touches: the auto-generated `entities/*.rs`, the matching `*Output` struct, the `From<Model>` impl, and (if mobile uses the field) the mobile codegen + UI. The first three are local; the fourth is cross-team and cross-deploy.

### Recommended Improvement

Introduce domain structs at the [core](https://coupling.dev/posts/dimensions-of-coupling/volatility/) boundary only — start with `Walk` and `Encounter`:

```rust
// services/walk.rs
pub struct Walk {
    pub id: Uuid,
    pub user_id: Uuid,
    pub status: WalkStatus,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub distance_m: Option<i32>,
    pub duration_seconds: Option<i64>,  // ← derived field has a home
}
impl From<WalkModel> for Walk { ... }
```

Services return the domain struct, not `Model`. GraphQL `*Output` wraps the domain struct (one less hop, one canonical model). This is a [contract-coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) move with [DDD](https://coupling.dev/posts/related-topics/domain-driven-design/) flavor — the `Walk` struct is the [aggregate](https://coupling.dev/posts/related-topics/domain-driven-design/) the codebase has been pretending it has.

Leave `Dog`, `User`, `DogMember`, `DogInvitation` alone. Their volatility is [low-enough that the unbalanced coupling is tolerable](https://coupling.dev/posts/core-concepts/balance/); wrapping them now is speculative work.

**Trade-off:** One more conversion step per service call; ~50 lines of new code per wrapped entity. Pays back the first time a derived field needs a home.

---

## Issue: `walk_points_service` re-leaks the table name it claims to encapsulate

**Integration**: `services/walk_points_service` -> resolver call sites (passing `table_name`)
**Severity**: **Significant**

### Knowledge Leakage

`services/walk_points_service.rs:13-22` declares: *"Every bit of knowledge about how walk points are stored in DynamoDB lives here. If the schema changes, this block is the only place that changes."* The PK/SK builders, attribute names, and item construction are indeed encapsulated. But the public functions `add_walk_points` and `get_walk_points` (`:84-86`, `:124-127`) require every caller to pass `table_name: &str`. Callers do:

```rust
walk_points_service::get_walk_points(
    &state.dynamo,
    &state.config.dynamodb_table_walk_points,  // ← caller knows the Config field
    walk_id,
)
```

at `mutations/walk.rs:162-164`, `custom_queries.rs:448`, and the writer in `mutations/walk.rs`. The rule *"walk points live in `state.config.dynamodb_table_walk_points`"* is a piece of [implicit, model-level knowledge](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) that the module advertises it owns and then declines to actually own.

### Complexity Impact

A reader sees the encapsulation comment and trusts it; then they grep for the table name and find it scattered. The contradiction is small in absolute lines but corrosive — it teaches the codebase that the rules in the comments are aspirational rather than enforced.

### Cascading Changes

A storage migration (sharding by week, splitting hot/cold tiers, renaming the table) touches three files instead of one. Worse, future call sites *must remember* to use the right `Config` field name; auto-completion is the only safety net.

### Recommended Improvement

Introduce a thin store struct that owns both the client and the table name:

```rust
pub struct WalkPointsStore {
    client: aws_sdk_dynamodb::Client,
    table_name: String,
}
impl WalkPointsStore {
    pub async fn add_points(&self, walk_id: Uuid, points: Vec<WalkPointInput>) -> Result<bool, AppError> { ... }
    pub async fn get_points(&self, walk_id: Uuid) -> Result<Vec<WalkPoint>, AppError> { ... }
}
```

Construct once in `main.rs`, store `Arc<WalkPointsStore>` in `AppState`. Resolvers call `state.walk_points.get_points(walk_id)`. Remove `dynamodb_table_walk_points` from anywhere that isn't the constructor. This is a [contract-coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) refactor: callers integrate via a method, not a tuple of `(client, table_name)`.

**Trade-off:** One small struct, one constructor call. The module finally delivers what its comment promises.

---

## Issue: `cognitoSub` exposed in the public `UserOutput` GraphQL type

**Integration**: `mutations/auth.rs::UserOutput` -> public GraphQL clients
**Severity**: **Significant**

### Knowledge Leakage

`mutations/auth.rs:14` exposes `cognitoSub` as a public field on `UserOutput`, returning the raw IdP subject claim. This is a [generic subdomain](https://coupling.dev/posts/dimensions-of-coupling/volatility/) implementation detail (Cognito-specific) leaked into the public published schema — clients can read it, parse it, build assumptions on its format. The only stable public identifier should be `user.id` (UUID).

**Verified usage (read-only grep):** `apps/mobile/` does **not** reference `cognitoSub` anywhere. The single consumer is `apps/e2e/tests/api/auth.spec.ts:193`, which asserts the field is truthy. So removal is safe at the mobile boundary; only the E2E assertion needs updating.

### Complexity Impact

The contract claims to be about a *user* but reveals the *identity provider*. Any future client developer who sees `cognitoSub` in the schema is now thinking about Cognito — even though Cognito is the most replaceable piece of the stack. This pollutes the mental model of the published language.

### Cascading Changes

If the team ever swaps identity providers (Auth0, Firebase, custom OIDC), or even rotates Cognito sub formats, any client that snapshotted `cognitoSub` semantics breaks silently. With `apps/mobile` clean, the actual blast radius today is one E2E assertion — but the *risk surface* (anyone who learns the schema) is everyone.

### Recommended Improvement

Remove the field from the public schema. Update `apps/e2e/tests/api/auth.spec.ts:193` to assert on `me.id` instead (the stable internal UUID). This is a [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/)-narrowing change — the published language stops mentioning the identity provider.

**Trade-off:** Trivial — one field removed, one test assertion updated. No mobile changes. Distance reduces (the contract no longer crosses into the IdP's domain).

---

## Issue: GraphQL output types live under `mutations/` but queries depend on them

**Integration**: `graphql/custom_queries.rs` -> `graphql/mutations/*::*Output`
**Severity**: **Minor**

### Knowledge Leakage

`WalkOutput` lives in `mutations/walk.rs:15`; `DogOutput` lives in `mutations/dog.rs:80`; `WalkEventOutput` in `mutations/walk_event.rs:13`. Yet `custom_queries.rs::walk_by_id_field` (line 322) returns `WalkOutput` from `mutations/`, and `dog_field` (line 346) returns `DogOutput`. The path implies "this type is the output of a mutation," but the type is really *the GraphQL projection of a Walk* — used by queries, mutations, and field resolvers alike. This is [low cohesion by intent](https://coupling.dev/posts/core-concepts/balance/) — the type's location lies about its scope.

### Complexity Impact

Readers must scan two folders to find a type's source. New contributors hesitate to move things because they're not sure whether the location encodes intent or accident.

### Cascading Changes

Adding a new query that returns `WalkOutput` requires reaching across the `mutations/` boundary. Each such cross-import normalizes the smell further.

### Recommended Improvement

Extract `graphql/types/`:

```
graphql/
  types/
    walk.rs        // WalkOutput, WalkerOutput
    dog.rs         // DogOutput, BirthDate
    walk_event.rs  // WalkEventOutput
    user.rs        // UserOutput
    encounter.rs   // (move from custom_queries.rs)
    friendship.rs  // (move from custom_queries.rs)
    walk_point.rs  // (move from custom_queries.rs)
  mutations/       // mutation field builders + input types only
  custom_queries.rs // query field builders only
```

This is a pure [cohesion](https://coupling.dev/posts/core-concepts/balance/) improvement — no behavior change.

**Trade-off:** Moves ~7 type definitions; one round of imports updates. Approximately one-hour change with high readability payoff.

---

## Issue: `dog_members.role` is a raw string compared in 5+ sites

**Integration**: `dog_member_service` ⇄ string literal `"owner"`/`"member"`
**Severity**: **Minor**

### Knowledge Leakage

The role enum is implicit — it lives in (1) the DB column allowed values, (2) `dog_member_service.rs:35` (`.eq("owner")`), `:134` (`if target_member.role == "owner"`), `:138` (`.eq("owner")`), `:167` (`Set(role.to_string())`), and (3) callers like `dog_service.rs:34` passing `"owner"` literal. This is classic stringly-typed [intrusive coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) — the compiler cannot help.

### Complexity Impact

A typo (`"owener"`) compiles. A new role added to the DB has no compile-time enforcement that all comparison sites consider it.

### Cascading Changes

Adding a third role (e.g., `"viewer"`) requires grep + tribal knowledge to find every site. Today the volatility is low (binary roles), but family sharing already added one membership concept; the next iteration could add another.

### Recommended Improvement

Introduce a domain enum:

```rust
pub enum Role { Owner, Member }
impl Role {
    pub fn as_str(&self) -> &'static str { match self { Self::Owner => "owner", Self::Member => "member" } }
}
impl FromStr for Role { ... }
```

Replace literals. SeaORM filters become `.eq(Role::Owner.as_str())`. This is a [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/)-coupling tightening — the contract is now the enum, not the spelling.

**Trade-off:** ~30 lines added, ~5 sites updated. Eliminates a class of silent bugs.

---

## Issue: `custom_queries.rs::walk_by_id_field` bypasses `walk_service`

**Integration**: `custom_queries.rs` -> `entities::walks::Entity` (direct)
**Severity**: **Minor**

### Knowledge Leakage

`custom_queries.rs:335` uses `WalkEntity::find_by_id(walk_id).one(&state.db).await` — the **only** GraphQL-layer site that touches a SeaORM entity directly. Every other resolver routes through services.

### Complexity Impact

Trivial in isolation; the smell is the inconsistency. New contributors copy what they see; one bypass invites more.

### Cascading Changes

If `walk_service` ever adds an invariant on read (e.g., scrubbing soft-deleted rows), this site silently breaks the invariant.

### Recommended Improvement

Add `services::walk::get_walk_by_id(db, walk_id) -> Option<WalkModel>` and use it. This aligns naturally with the H2 domain-struct refactor but does not require it — five-minute change.

**Trade-off:** One new service function. Restores the rule that services own DB access.

---

## Issue: GraphQL inputs are parsed inline with `try_get`/`string()` patterns

**Integration**: GraphQL schema declarations (`*_input_type()` factories) ⇄ resolver parsing bodies
**Severity**: **Minor**

### Knowledge Leakage

Every mutation declares input shape in a factory function (`create_dog_input_type()` etc.) and then re-parses each field inline in the resolver (`input.try_get("name")?.string()?`). The field name and type are duplicated knowledge — [implicit coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) between two collaborating sites in the same file with no compiler check.

### Complexity Impact

A field rename requires editing both sites; a typo compiles. Same failure mode as the stringly-typed role issue (M3) but spread across every mutation.

### Cascading Changes

Adding a new input field touches the factory and every parsing site. Removing a field that resolvers still try to `try_get` is silent until tested.

### Recommended Improvement

Define Rust input structs with a single parse step. Input structs can live in `graphql/input/` next to the existing `birth_date.rs`. (Note: Seaography's dynamic schema may need glue to bridge the factory-declaration shape to a `#[derive(InputObject)]` — but the same factory + a single deserialize call is enough.)

**Trade-off:** ~10 input structs to write; meaningful reduction in bug surface across all mutations.

---

## Quality Observations (non-modularity)

These are surfaced for completeness — they affect the codebase but are not strictly [Balanced Coupling](https://coupling.dev/posts/core-concepts/balance/) issues:

- **N+1 query patterns in field resolvers** (`mutations/walk.rs:128, 142, 191`; `custom_queries.rs:211, 222, 296`; `mutations/dog.rs:247`). Each field resolver fetches one row at a time. This is a query-plan / performance issue, not [unbalanced coupling](https://coupling.dev/posts/core-concepts/balance/) — adding a batched `get_dogs_by_ids` alongside `get_dog_by_id` does not require any cascading change. Worth fixing with `async-graphql::dataloader::DataLoader` (start with `Dog` and `User`), but the modularity rationale is weak; the perf rationale is strong. Mentioning here so it isn't lost.
- **Tests heavily concentrated at the GraphQL boundary** (12 integration test files, few service-level unit tests). This is a test-pyramid issue, not a coupling issue. Schema changes ripple through tests; targeted unit tests at the service layer would shorten the feedback loop.

---

## Health Observations (worth keeping)

These are *good* coupling decisions worth naming so future changes don't undo them:

1. **`DogPair` newtype** (`services/dog_pair.rs`) — textbook abstraction for canonical-ordering invariants. Every encounter/friendship caller goes through it.
2. **`auth_helpers.rs`** + GraphQL/domain enum parity tests (`graphql/mod.rs:107-158`) — small, single-responsibility helpers with guard tests that fail loudly when invariants drift.
3. **`AppError` → GraphQL conversion** at the resolver boundary (`error.rs::into_graphql_error`) — clean [anti-corruption layer](https://coupling.dev/posts/related-topics/domain-driven-design/); services know nothing about GraphQL, GraphQL knows nothing about SeaORM error types.
4. **Service layer is the only DB boundary** (with one exception, the L1 minor issue above). Unusual discipline for a Seaography codebase.
5. **`walk_points_service` schema encapsulation** (PK/SK builders, `build_point_item`/`parse_point_row`, stable-format unit tests). The pattern is right; just needs to swallow the table name too (M1).
6. **`encounter → friendship` transactional coupling** is high-strength but **cohesively** so — friendship is literally the aggregate of encounters. The strength is *essential, not accidental*. Don't try to "decouple" by introducing events for events' sake.

---

## Recommended Sequence

If only three changes are taken: **H1 → M1 → M4.**
- **H1** is a small surgical fix that closes a real abstraction leak.
- **M1** delivers on a promise the module already made.
- **M4** has been verified safe (mobile clean, one E2E assertion to update) — turning a leak in the published language into a cleanup.

For a longer pass: add **H2 for `Walk` only** (the most-touched core entity), then **M2** (reduces friction across the GraphQL layer), then **M3** + **L1** + **L2** as cleanup.

Defer **H2 for non-core entities** until volatility forces them — the `From<Model>` site keeps the cost low today.

---

## Verification

To validate that any of the above changes preserve behavior:

```bash
# unit tests (no test-utils feature needed)
docker compose -f apps/compose.yml run --rm api cargo test --lib

# full integration tests
docker compose -f apps/compose.yml run --rm api cargo test --features test-utils -- --test-threads=1
```

For **H1**: existing JWT tests (`tests/test_authorization.rs` + `auth/jwt.rs::tests::*`) cover both `CognitoJwtVerifier` and `NoOpJwtVerifier` paths. For **M4**: update `apps/e2e/tests/api/auth.spec.ts:193` to assert on `me.id`. For **M2/M4** (schema-shape changes): if a GraphQL schema dump is checked into `docs/`, regenerate and diff.

---

## Out of Scope

- **`main.rs` as composition root** knowing every subsystem — by design for a Rust binary, not a coupling defect.
- **Sentry / tracing wiring** — pure infrastructure, well-isolated.
- **Mobile-side coupling to API contract** — this review is `apps/api/` only, but H2 and M4 acknowledge the boundary.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
