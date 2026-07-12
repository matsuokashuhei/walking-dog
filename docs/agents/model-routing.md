# Model Routing

Use Luna for read-only inventory, Terra for the one tracked implementation owner,
and Sol for planning/integration and an independent final review. Final Sol review
defaults to medium thinking and escalates only for high risk, Critical findings,
or a specification contradiction. The implementation task and final-review task
must have distinct IDs and thread identities.

The preferred enforcement ladder is: types/Cargo/schema/Clippy/code generation,
then syntax-local shallow AST. Do not emulate compiler semantics with cross-file
resolution, alias fixed points, macro expansion, or type inference.
