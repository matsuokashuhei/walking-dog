# Task 1.2h — Structural architecture validator

## Outcome

Replaced the `apps/api` architecture validator's source-line substring matching with parsed `syn` AST and recursive macro-token inspection for `API-ARCH-001` through `API-ARCH-012`.

The validator now derives repository-relative paths from `SourceUnit`, line numbers from `proc_macro2::Span`, and safe symbols from structural names. Sensitive logging diagnostics report the macro name (for example `tracing::info!`) and never echo field values or source lines. Parse failures remain fatal through `ValidationError::Parse`.

## TDD evidence

### RED 1: adversarial structural syntax

Added one valid-Rust fixture for each rule, covering:

- `extern crate` aliases for environment and AWS access;
- nested, globbed, renamed, and `self` imports;
- whitespace-separated `unwrap ()`;
- public type aliases and reexports;
- multiline resolver repository imports;
- alias-hidden adapter construction;
- multiline cross-application imports;
- raw SQL macro/raw string tokens;
- multiline sensitive logging fields and values.

Focused command:

```text
cargo test -p architecture-validator --test fixtures structural_syntax_cannot_hide_any_architecture_rule -- --nocapture
```

Observed failure before implementation:

```text
missing structural diagnostic API-ARCH-001 at crates/application/src/config.rs:2; got []
test result: FAILED. 0 passed; 1 failed
```

### RED 2: chained aliases

Strengthened `API-ARCH-009` to hide construction behind two aliases (`adapter_postgres -> db -> Store`).

Observed failure before recursive canonicalization:

```text
missing structural diagnostic API-ARCH-009 at crates/adapter-graphql/src/lib.rs:3; got []
test result: FAILED. 0 passed; 1 failed
```

### GREEN

The focused test passed after implementing the visitor and recursive alias canonicalization:

```text
running 1 test
test structural_syntax_cannot_hide_any_architecture_rule ... ok
test result: ok. 1 passed; 0 failed
```

## Implementation details

- A `syn::visit::Visit` analyzer structurally inspects items, paths, calls, method calls, macros, and literals.
- Recursive `UseTree` flattening handles nested groups, globs, renames, `self`, and public reexports.
- A prepass records `use` and `extern crate` aliases. Canonicalization follows alias chains and terminates safely on cycles.
- Public-boundary context covers public functions, type aliases, structs, traits, constants, modules, and reexports for `API-ARCH-006`.
- Resolver concerns, adapter constructors, cross-application imports, raw SQL, aborting calls/macros, provider SDKs, and sensitive log macros are detected from parsed nodes/tokens rather than formatted lines.
- Diagnostics deduplicate identical rule/line pairs and preserve exact repository-relative file and span line locations.
- Allowed-location fixtures were not changed or weakened. No warning/allow/exception bypass was added.

## Final verification

All Rust commands ran in the repository `apps-api` Docker toolchain because the host does not provide `cargo`. The external Git worktree metadata was mounted read-only for repository-aware validator tests.

```text
cargo test --target-dir /tmp/walking-dog-target -j 1 -p architecture-validator
```

Result: all unit, integration, fixture, intent, policy, workspace, and doc tests passed.

```text
cargo clippy --target-dir /tmp/walking-dog-target -j 1 -p architecture-validator --all-targets -- -D warnings
```

Result: passed with no warnings.

```text
cargo check --target-dir /tmp/walking-dog-target -j 1 --workspace --all-targets
```

Result: passed.

```text
scripts/harness/validate-all.sh
```

Result: passed in the project Docker image. The direct host attempt failed only because `cargo` is not installed; no validator or harness assertion failed.

## Scope and product/journey impact

Changed files intentionally committed for this task:

- `apps/api/tools/architecture-validator/Cargo.toml`
- `apps/api/tools/architecture-validator/src/ast.rs`
- `apps/api/tools/architecture-validator/tests/fixtures.rs`
- `.superpowers/sdd/task-1.2h-report.md`

`apps/api/Cargo.lock` was generated/modified while resolving the direct `proc-macro2` span-locations feature but is deliberately excluded from this commit per integration instructions. All other concurrent worktree changes are also excluded.

This is static architecture tooling only. It changes no dog experience, walk data, or owner contribution behavior, and affects no mobile/API user journey; therefore no Maestro flow is applicable.

## Concerns

- The direct `proc-macro2` dependency requires the existing workspace lockfile to include it as an architecture-validator dependency during root integration. The lockfile change is intentionally left unstaged for the root integrator.
- Macro bodies are necessarily token-inspected because Rust procedural/declarative macro input is not generally parseable as normal Rust AST before expansion. Inspection is recursive and span-aware, and it does not fall back to source-line substring matching.
