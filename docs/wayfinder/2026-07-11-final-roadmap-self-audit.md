# Final Roadmap Input/Output Self-Audit

## Scope and method

This is the required self-review before human review of
`docs/roadmaps/2026-07-11-api-mobile-replacement-implementation-plan.md`.
The audit compares inputs to roadmap outputs and then walks outputs backward to
an authoritative input. It checks coverage, contradictions, placeholders,
interface names, dependencies, files, commands, completion claims, visual-review
evidence, and privacy/verifiability.

Inputs audited:

- complete PR #366 and PR #367 architecture designs;
- all 125 numbered sections across the 13 `docs/tmp-testcases/` inventories;
- every superseding decision in the acceptance normalization;
- `CONTEXT.md`, product principles, domain rules, ownership map;
- API/Mobile kernels, GraphQL contract, Harness design, migration sequence;
- approved Mobile wireflow and its review/fix history;
- root `AGENTS.md` mechanical and Journey-evidence rules.

Audit outcomes are `covered`, `excluded by explicit decision`, or `gap`. No item
may be merely implied by a screenshot, generic “test everything” statement, or a
future follow-up.

## Architecture coverage

### PR #366 / API design

| Input area | Roadmap implementation | Status |
| --- | --- | --- |
| Greenfield cutover/no compatibility | PR 1 deletes product/migration/consumer crates; global constraints | covered |
| Virtual workspace and dependency direction | Tasks 1.1–1.2 exact crates, policy, metadata checks | covered |
| Default-deny third-party/features/targets | Task 1.2 graph/AST fixtures and `cargo metadata --locked --all-features` | covered |
| Twelve AST rules and diagnostics | Task 1.2 stable positive/negative fixtures, SARIF/human output | covered |
| Exact 30-day exceptions | API policy files plus PR 11 expired-exception deletion | covered |
| Immutable change intent | Task 1.2 `intent.rs`; every PR global intent requirement | covered |
| Atomic Journey generator | Task 1.2 generator source/templates/collision and `verify-generated` tests | covered after audit fix |
| Single Testcontainers runtime | PR 3 Harness runtime; old Compose/dev scripts deleted PR 1 | covered |
| Five required API checks | PR 3 creates separate architecture, unit, integration, GraphQL, Journey workflows | covered after audit fix |
| Knowledge promotion | PR 11 CONTEXT/Journey/ADR/validator/runbook work | covered |
| Permanent invariants/no hidden fallback | global constraints, negative fixtures, PR 11 residue scan | covered |
| Kernel exit/production deployability | PR 1 required result and deployment workflow update | covered |

### PR #367 / Mobile design

| Input area | Roadmap implementation | Status |
| --- | --- | --- |
| Vertical modular monolith | PR 2 exact roots and eight Feature manifests | covered |
| Route-only composition/public entrypoints | Task 2.2 compiler fixtures and each Journey route task | covered |
| Default-deny graph/cycles/deep imports | Task 2.2 `MOB-ARCH-001`–`014` fixtures | covered |
| No app-wide mutable state | PR 2 removes Zustand; explicit XState/Query/React/SQLite owners | covered |
| Explicit lifecycle machines | PR 4 auth and PR 7 Walk XState tests | covered |
| Two real adapters per seam | module compiler plus production/in-memory contract tasks in PRs 4–10 | covered |
| Generated GraphQL transport only | Task 3.1 and every schema/codegen step | covered |
| Typed errors/recovery | Mobile Result/error kernel; operation contracts and Journey failures | covered |
| Machine-readable manifests | Task 2.2 schema/compiler and exact Journey ledger | covered |
| Small knowledge system | PR 11 documentation/promotion constraints | covered |
| Editing/commit/PR/main/nightly gates | PR 2 fast gates, PR 3 workflows, PR 11 matrix | covered |
| Interface-leverage testing | per-slice domain/application/adapter/Feature/Maestro order | covered |
| AI-agent intent/context/review protocol | intent compiler and generated review input/workflow/dismissal tests | covered after audit fix |
| Initial delivery order/foundation slice | PRs 1–4; Access Account is first representative product Journey | covered |
| iOS-only scope | deployment target 18.0 and explicit target deletion | covered |
| No speculative Watch/Live Activity | PR 2 deletion and architecture rejection | covered |

## Acceptance inventory coverage

Every numbered section is assigned once through the ownership map and an exact
Journey scenario ledger. Section ranges below cover all 125 sections.

| Inventory | Sections | Primary roadmap owner | Scenario evidence | Status |
| --- | ---: | --- | --- | --- |
| Sign Up | 1–6 | Tasks 4.1–4.2 | Access Account | covered |
| Login | 1–7 | Tasks 4.1–4.2 | Access Account; PR 7 adds Active auth recovery | covered |
| Email Change | 1–7 | Tasks 4.1–4.2 | Access Account; Settings entry composed PR 5 | covered |
| User Edit | 1–11 | Tasks 5.1–5.2 | Owner/Profile success, validation, media, recovery, accessibility/privacy | covered |
| Settings | 1–6,8 | Task 5.2 | Profile/Preferences scenarios | covered |
| Settings | 7 | Tasks 4.1–4.2 and PR 5 composition | Access Account plus Active-Walk guard fixture | covered |
| User Screen | 1–4,7 | Task 5.2 | Owner/Profile states and navigation | covered |
| User Screen | 5–6,10–12 | Tasks 10.1–10.2 | Owner Contribution matrix/evidence | covered |
| User Screen | 8–9 | PRs 4–5 route composition | Access/Preferences | covered |
| Dogs List | 1–9 | Tasks 6.1–6.2 | Dogs success/empty/error/refresh/accessibility/privacy | covered |
| Dog Registration | 1–4,6–13 | Tasks 6.1–6.2 | Dogs validation/media/permission/recovery | covered |
| Dog Registration | 5 Breed | Normalization and global constraints exclude Mobile/API Breed; PR 6 negative proof | excluded by explicit decision |
| Dog Edit | 1–6 | Tasks 6.1–6.2 | Dogs edit/archive/error/accessibility/privacy | covered |
| Dog Detail | 1–2,6–7 | Task 6.2 | Dogs detail | covered |
| Dog Detail | 3–4 | Tasks 10.1–10.2 | Dog Contribution/Goal progress | covered |
| Dog Detail | 5 | Tasks 9.1–9.2 | Dog-filtered History | covered |
| Walk Screen | 1–8,11–14 | Tasks 7.1–7.2 | Record Walk location/lifecycle/recovery/accessibility/privacy | covered |
| Walk Screen | 9–10 | Tasks 8.1–8.2 | Capture Events/Photo | covered |
| Walk History | 1–13 | Tasks 9.1–9.2 | History success/validation/error/empty/accessibility/units/privacy | covered |
| Walk Detail | 1,3–12 | Tasks 9.1–9.2 | Detail route/map/time/participants/metrics/events/media/error/evidence | covered |
| Walk Detail | 2 | Tasks 7.2 and 9.2 route composition | Active Walk override | covered |

The scenario ledger contains 52 fixture basenames and 52 corresponding Maestro
flows. Registry validation requires every scenario to name the exact normalized
outcomes and evidence fields it covers; count alone cannot satisfy the gate.

## Superseding decision audit

| Decision | Roadmap proof | Status |
| --- | --- | --- |
| Exact-character Dog-name uniqueness only | PR 6 tests and API/Mobile contracts | covered |
| Breed reserved DB column, no API/UI | PR 6 negative tests; PR 11 residue scan | covered |
| Partial Birthday and midpoint age calculation | PR 6 domain/UI tests | covered |
| Independent Daily/Weekly, defaults 30/120, no conversion | PR 6 Goal tests | covered |
| Interrupted hidden everywhere | PR 7 lifecycle plus PRs 9–10 read-model tests | covered |
| Foreground denial blocks Start; loss interrupts | PR 7 permission/location scenarios | covered |
| Last-write-wins Owner/Dog | PRs 5–6 mutation/refetch tests | covered |
| Current names/images, no snapshots | PR 9 history contracts | covered |
| Unknown events ignored and counted safely | PRs 8–9 contracts/evidence | covered |
| Completed-only metrics/history/contribution | PRs 7,9,10 boundaries | covered |
| Fixed 20 pages and stable ordering | PR 9 cursor/order tests | covered |
| Media normalization/atomicity/pending retry | PRs 5,6,8 | covered |
| 30s/60s timeouts and dirty/double-submit rules | exact Journey scenario obligations and Feature tests | covered |
| No production-data/device-data migration | PR 1/2 destructive baselines and rollback discipline | covered |

## Interface and dependency consistency

- API application names are exactly `identity`, `owner`, `dog`,
  `walk_recording`, `walk_event`, and `walk_insight` in the ownership map,
  kernels, sequence, and file-level tasks.
- Mobile Feature names are exactly `account-access`, `owner-profile`,
  `preferences`, `dogs`, `walk-recording`, `walk-events`, `walk-history`, and
  `contribution` everywhere.
- The only direct Feature edge is `walk-events -> walk-recording` through
  `ActiveWalkContext`; auth, preferences, Me/Dog composition, and Active detail
  redirect use shell/public capabilities.
- GraphQL root/operation ownership matches the six API modules. Authentication
  failure is consistently HTTP 401/top-level `AUTHENTICATION_REQUIRED`; resource
  authorization is typed indistinguishable Not Found.
- XState, TanStack Query, React local state, SQLite, and SecureStore have distinct
  owners. Effect, Zustand, Graffle, AsyncStorage domain state, and client cache
  alternatives are deleted.
- PR order has no cycle: Dogs precede recording; recording precedes events;
  events precede complete History; History precedes Contribution. Fixtures used
  before a producer are explicitly non-public contract fixtures.
- PR 7 does not invent Walk Detail. PR 9 replaces saved-confirmation-to-Ready with
  direct real detail navigation. The approved wireflow records both outcomes.

No inconsistent type, module, Feature, route, Journey, operation, capability, or
state-owner name was found after correction.

## File, command, and completion-claim audit

- Every PR names created/modified/deleted roots and each Task names its produced
  interface. Exact Journey/fixture/flow basenames are listed centrally and
  referenced by tasks.
- Commands cover Cargo metadata/check/test/fmt/clippy, schema/codegen clean diff,
  npm install/test/type/lint/Knip/architecture/GraphQL, Harness verification,
  selected/all Journey profiles, evidence/privacy, iOS build/install/launch, and
  repository validation.
- Expected results are observable: pass/fail rule IDs, HTTP readiness, no diff,
  exact UI/API/resource comparison, no unsafe artifact, no leak, and exit 0.
- PR exit criteria never claim a not-yet-migrated Journey. Foundation shells are
  explicitly honest. Later PRs rerun every previously migrated Journey.
- Rollback selects the previous complete API image/Mobile build pair and never
  activates legacy code or mixes schemas.

## Placeholder and ambiguity audit

Scans cover `TBD`, `TODO`, “implement later”, “fill in”, “appropriate error”,
“Similar to”, wildcard fixture paths, nonexistent route references, and warning
gates. Matches remaining in the roadmap are prohibitions, not placeholders.

Directory braces in file lists are finite path expansions, not undetermined
work. PR 11's deletion report is intentionally derived from authoritative Git,
Cargo metadata, Knip, and ownership reports because the exact set is the output
of prior PRs; its zero-residue condition is mechanically testable.

## Findings and resolutions

| Finding | Resolution |
| --- | --- |
| API Journey generator absent from file-level plan | Added generator source, templates, collision/closed-registry/adapter/contract/observability tests, and `verify-generated` command to Task 1.2 |
| Mobile independent AI review evidence absent | Added deterministic review-input generator and advisory workflow/durable P0/P1 dismissal tests |
| API five required checks collapsed into generic workflow | Split exact architecture, unit, integration, GraphQL, and Journey workflow paths |
| Initial GraphQL design put authentication in operation unions | Corrected to shared 401 single-flight refresh; resource authorization remains Not Found |
| Harness initially proposed an alternate identity adapter | Corrected to production Cognito adapter against deterministic compatible provider |
| Wireflow referenced nonexistent `WALK-05` and omitted Email Change routes | Added AUTH-04/AUTH-05 and staged PR 7/PR 9 completion destinations |
| File-level roadmap used fixture globs and vague matching scenarios | Added exact 52-pair scenario ledger and exact legacy Journey deletion points |

All findings were fixed in the authoritative roadmap/design outputs before this
audit was marked complete. There are zero open findings.

## Verification record

- `git diff --no-index --check /dev/null` on every new planning document and the
  HTML artifact: no whitespace diagnostic.
- roadmap placeholder/ambiguous-glob scan: no unresolved match.
- browser artifact QA: filter and detail interactions pass; 1280px and 390px
  layouts have no horizontal overflow; print preserves all nodes.
- `scripts/harness/validate-all.sh`: exit 0 with no output after final corrections.
- Wayfinder issues #369–#377 contain resolution comments and are closed before
  this audit.

## Audit conclusion

The roadmap covers every PR #366/#367 architecture obligation and all 125
numbered acceptance sections, including explicit exclusions and superseding
decisions. It has no known contradiction, placeholder, unmapped requirement,
inconsistent interface, missing dependency, or unverifiable completion claim.
It is ready for human review; implementation has not started.
