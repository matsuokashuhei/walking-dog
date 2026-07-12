# Development Process and Architecture Gate Simplification Design

**Status:** Approved implementation record

## Goal

Make a persistent change manifest the executable record for this change, make the
API architecture gate deliberately syntax-local, and replace semantic
Testcontainers source analysis with a closed image catalog and generated runtime
surface. This is development-process infrastructure: it affects no dog/owner UI
or executable Maestro journey.

## Product and harness impact

- Dog experience, walk data, and owner contribution: no direct user-facing
  behavior changes.
- Journey evidence: **no affected journey**. The change governs development and
  test infrastructure only; API and mobile validation are the applicable proof.
- Rollback: revert this change's commits, restoring the previous validators and
  generated runtime surface atomically.

## Change-record contract

`docs/development/changes/YYYY-MM-DD-<slug>.json` is a live record, validated
against `docs/development/changes/schema.json`. A changed-base/head range must
contain exactly one manifest. Its paths partition all owned changed paths; each
task declares its role, model, thinking level, owner thread, acceptance checks,
consumer checks, and rollback. The validator rejects schema errors, gaps,
overlap, missing evidence, disallowed model/role/thinking values, an
implementation task reused as final review, and a missing independent Sol review.

The dogfood manifest for this change records: planner/integration Sol
`019f505b-e7ba-7ae3-8b77-1d77c8882475`, Luna inventory
`019f54f5-eaaf-74d0-9901-77673361c3a9`, Terra implementation
`019f54fa-a2de-79b1-b4b1-c22c3630f176`, and independent final Sol review
`019f54f9-cd15-72a2-8d04-b0cad89b700b`. Independent Sol defaults to medium
thinking and may escalate only for high risk, Critical defects, or a spec
contradiction. The same-cause retry threshold is three.

The frozen manifest names the independent Sol reviewer task and expected evidence.
The PR body or external CI evidence stores the immutable final head SHA and Sol
approval/result for that exact SHA; it is not written back to the manifest after
review. A PR-body `edited` event reruns validation and rejects missing or
malformed evidence, or an approval SHA that differs from the current head. An
otherwise matching head approval remains valid when prose alone changes.

## Enforcement ladder and canonical parsing contract

Checks first use declared type/Cargo/schema/Clippy/codegen policy. If that cannot
express a required guarantee, they may use only syntax-local shallow `syn` AST
inspection. They must not implement compiler semantics: no cross-file name or
export resolution, alias fixed points, macro expansion emulation, type inference,
or lexical SQL semantic guessing.

For governed Rust surfaces, aliases, globs, re-exports, `extern crate`,
`include!`, and `cfg` hiding are rejected rather than resolved. Parsing,
filesystem I/O, Cargo metadata, exception validation, and intent/diff validation
remain fail-closed with human and SARIF path/line/column diagnostics. Existing
exception fingerprint, expiry, owner, ADR, removal-issue and intent/git-diff
bidirectional equality semantics remain exact.

All twelve stable API rule IDs remain applicable. Cargo dependency policy owns
the dependency constraints formerly duplicated by AST checks. Clippy owns
`unwrap`/`expect` where it is equivalent. The shallow gate retains explicit
source checks for environment/I/O/feature paths, raw SQL, sensitive logging, and
the resolver boundary. Rules 005, 006, and 012 remain protected; Rule 008 becomes
a declared resolver boundary rather than word/path inference.

## Closed Testcontainers design

`apps/api/architecture/test-images.json` is the catalog of canonical test images.
`cargo xtask image-catalog generate` renders the opaque `harness-runtime`
Postgres container from a fixed template; `verify` renders to a temporary value
and rejects drift. Only `harness-runtime` may directly depend on canonical
`testcontainers`; aliases, `build.rs`, and build-dependencies are forbidden.
Generated runtime code is the sole implementation surface; it exposes no public
`GenericImage` or testcontainers types. The prior semantic `images.rs` resolver
and resolver-centric tests are deleted and replaced by catalog, deterministic
generation, Cargo dependency, and runtime lifecycle tests. CI runs generation
twice and requires a clean diff.

## Process consumers

The change validator is called by `validate-all`, Harness CI, the PR template,
and documented local workflow. The API architecture command remains
`cargo xtask architecture check`, while its implementation becomes smaller. The
50% audit explicitly checks AGENTS/CLAUDE, PR template, Harness/test-api
workflows, validation scripts, VS Code task, API README/runbook, Cargo workspace
and lockfile, and the xtask CLI.

## Non-goals

Do not migrate `docs/tmp-testcases`, clean unrelated wayfinder material, change
product behavior, or weaken a current guarantee that cannot be preserved by the
canonical syntax contract.

## Lessons promoted

Document and enforce the lessons from overbuilt validators, late integration
review, shared-file conflicts, compile-only CI, tracked scratch files, and remote
drift. `.superpowers` is never a tracked artifact.
