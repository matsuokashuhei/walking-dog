# Development Process

Every change that crosses a reviewed base/head range has one changed active
manifest in `docs/development/changes/`. The manifest partitions changed paths,
names one owner per task, records dependencies, acceptance, consumer decisions,
rollback, enforcement layer, non-targets, and RED/GREEN/frozen milestones.

Use `scripts/development/validate-change-manifest.sh` for repository history.
PR CI uses its `--pr` mode with the base/head range and a single structured PR
evidence marker. The marker binds the changed manifest, approved task identities,
successful test evidence, head SHA, and independent Sol result; it is external
evidence and is not written into the frozen manifest after review.

Same-cause failures stop after three attempts. Never track `.superpowers` scratch
files. No affected journey is valid only when the manifest says so and the change
does not alter product behavior, API contracts, persistence, permissions, or UI.
