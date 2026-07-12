# Model Routing

Sol owns requirements, design, PR split, architecture/security decisions,
integration, and merge judgment; it independently reviews frozen heads. Terra
owns TDD implementation, refactoring, debugging, and integration. Luna handles
exploration, consumer inventory, mechanical changes, verification, and evidence;
anything requiring judgment transfers to Terra. Ordinary internal subagents are
never Luna/Sol evidence and independent Sol has no implementation history.

Default thinking is medium, including independent Sol review. High-thinking work
is limited to API/schema, migration, auth/privacy, concurrency, and infrastructure
risk. After three same-cause failures, escalate to Sol for redesign; Critical
findings or a specification contradiction require high-thinking Sol review.

Use types/Cargo/schema/Clippy/codegen before syntax-local AST. Do not emulate
compiler semantics with cross-file resolution, alias fixed points, macro
expansion, or type inference.
