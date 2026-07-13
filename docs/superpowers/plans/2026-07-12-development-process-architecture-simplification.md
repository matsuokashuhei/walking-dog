# Development Process and Architecture Gate Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. The native worktree already exists; do not create another one.

**Goal:** Implement the approved live change record, simpler fail-closed API
gate, closed Testcontainers catalog, and their CI/documentation consumers.

**Architecture:** A Node validator owns process-record validation and is composed
by shell/CI. Cargo policy and Clippy own dependency and panic policy; the Rust
validator parses individual source files only. Image declarations are static JSON
and deterministic Rust generation, so no source resolver is needed.

**Tech Stack:** JSON Schema, Node.js, shell, Git diff, Rust/syn/Cargo metadata,
Cargo xtask, Testcontainers, GitHub Actions.

## Global constraints

- Branch is `codex/development-process-architecture-simplification` from
  `origin/main`.
- The manifest is active system of record and records exact commands plus RED and
  GREEN evidence before each milestone freeze.
- Preserve API-ARCH-001 through API-ARCH-012 identifiers, scope, exceptions,
  intent/diff behavior, fail-closed metadata/parse/I/O, and precise diagnostics.
- Do not implement custom compiler semantics or public testcontainers types.
- No UI or Maestro journey is affected; record that fact in manifest evidence.

### Task 1: Commit the approved design and plan

**Files:** Create the design and plan in `docs/superpowers/{specs,plans}/`.

- [ ] Verify the design names approved invariants, roles, exact thread IDs,
  parser contract, image design, non-goals, and no-journey determination.
- [ ] Run `git diff --check` and scan for incomplete planning markers; expect no
  errors or matches.
- [ ] Commit `docs: record architecture simplification design and plan`.

### Task 2: Live manifest validator (RED then GREEN)

**Files:** Create `docs/development/changes/schema.json`, dogfood manifest,
`scripts/development/validate-change-manifest.{mjs,sh}`, and focused Node fixture
tests. Modify `scripts/harness/validate-all.sh`, `.github/workflows/harness.yml`,
and `.github/pull_request_template.md`.

- [ ] Add fixtures that fail for zero/two manifests, schema violation, unowned and
  overlapping paths, missing acceptance/consumer/rollback, invalid role/model/
  thinking, shared implementation/final-review task, absent Sol reviewer, and
  mismatched PR head approval. Run and record RED evidence.
- [ ] Implement JSON Schema validation and Git base/head path accounting.
- [ ] Compose shell, CI, and PR-template evidence including Harness rerun after
  PR edits and exact Sol head-SHA binding. Re-run focused tests and harness tests;
  record GREEN evidence and commit.

### Task 3: Development-process docs, routing, and roadmap

**Files:** Create `docs/agents/development-process.md`,
`docs/agents/model-routing.md`, `.codex/skills/pr-development/SKILL.md`. Modify
`AGENTS.md`, `docs/harness/lessons-learned.md`, API README/runbook, roadmap.

- [ ] Add a RED documentation-contract assertion for manifest/routing/ladder/
  threshold/scratch policy. Add operational documentation and concise AGENTS
  index entries.
- [ ] Add PR2A/2B/2C, PR3A/3B, PR11A/11B responsibility, interface, acceptance,
  rollback, dependency order boundaries; retain PR4–10 vertical slices.
- [ ] Run documentation contract and knowledge validation; commit.

### Task 4: API canonical syntax contract (RED then GREEN)

**Files:** Modify architecture-validator `ast.rs`, `check.rs`, `lib.rs`,
`policy.rs`, fixtures and tests. Delete resolver-specific internals only after
replacement tests are RED.

- [ ] Add failing fixtures for governed alias/glob/re-export/`extern crate`/
  `include!`/`cfg` syntax with ID/path/line/column; preserve 005/006/012 and
  syntax-local async-graphql resolver/raw-SQL boundaries. Run focused tests and
  record RED.
- [ ] Replace cross-file/export/alias/trait resolution and lexical SQL inference
  with syntax-local checks plus noncanonical-form rejection. Keep fail-closed
  parse/I/O/metadata/exceptions/intent/diff/human/SARIF contracts. Apply the
  Rule 008 capability-prefix check to canonical adapter-graphql `use` leaves as
  well as resolver impl paths, without resolving imports.
- [ ] Move equivalent unwrap/expect enforcement to strict Clippy configuration.
  Re-run focused tests and commit.

### Task 5: Closed image catalog and generated runtime (RED then GREEN)

**Files:** Create `apps/api/architecture/test-images.json`, template and xtask
image-catalog module/tests. Modify harness-runtime, xtask, Cargo manifests/policy/
lock, validator policy/tests. Delete `architecture-validator/src/images.rs` and
resolver tests.

- [ ] Add RED catalog/determinism/second-generate/dependency/alias/build.rs/
  opaque-API/PostgreSQL lifecycle tests.
- [ ] Implement fixed-template generation and verify, generate checked-in opaque
  Postgres runtime, and restrict direct canonical dependencies to harness-runtime.
- [ ] Run generation twice plus clean diff, lifecycle and focused package tests;
  commit.

### Task 6: 50% consumer audit and integration

- [ ] Before freeze, record in the manifest the audit of AGENTS/CLAUDE, PR
  template, Harness/test-api workflows, validation scripts, VS Code, API
  README/runbook, Cargo workspace/lock, and xtask CLI, including unchanged users.
- [ ] Run harness tests, architecture fixtures, image verify, and diff check;
  commit coherent consumer corrections.

### Task 7: Full verification and final-review evidence

- [ ] Update the manifest before this freeze with base/head, exact RED/GREEN
  commands, consumer audit, no affected journey, rollback, and reviewer awaiting
  final SHA.
- [ ] Run API workspace all targets/features/locked tests, strict Clippy, fmt,
  architecture against origin/main, harness tests/validate-all, mobile typecheck/
  lint/knip, image generation twice+clean diff, and PostgreSQL lifecycle.
- [ ] Inspect diff/status and tracked `.superpowers`. Freeze the manifest with
  the independent reviewer task and expected evidence, then obtain Sol approval
  for the exact frozen SHA in PR body or external CI evidence. Address
  Critical/Important findings before a new freeze; do not mutate the manifest
  after review or open/merge a PR. PR-body edits rerun validation and must retain
  well-formed evidence whose approval SHA matches current head.
