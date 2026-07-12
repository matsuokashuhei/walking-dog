# Development Process

Before work, read the applicable docs, identify base/head, create one active
manifest, and derive tasks from its single owners, dependencies, acceptance,
consumer decisions, non-targets, enforcement layer, and rollback. Create a RED
test before production edits, record its command/result, implement minimally,
then record GREEN. Re-read the plan before each task and freeze.

Commit coherent milestones; update the manifest before each freeze and push only
after its commands pass. At 50%, audit AGENTS/CLAUDE, PR template, Harness and
test-api workflows, validation scripts, VS Code, API README/runbook, Cargo/lock,
and xtask. Re-read the diff, manifest, and non-targets before final verification.

Independent final review happens only on a frozen head. Critical or Important
findings block merge; a changed head requires a new review. Its exact-SHA evidence
lives externally, never in a post-review manifest commit. After merge, retain the
manifest in history, observe CI, and use its recorded rollback rather than hiding
or optionalizing defects. Three same-cause failures require escalation.

Use history validation locally; PR validation requires one changed manifest and
the structured evidence marker. Never track `.superpowers` scratch files.
