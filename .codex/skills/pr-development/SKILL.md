---
name: pr-development
description: Develop walking-dog changes with the active manifest and evidence gate.
---

Preflight: read task docs, identify base/head, create the manifest-derived task
record, write RED before production code, then record GREEN. Re-read plan and
manifest before every task/freeze; commit coherent milestones and update the
manifest before freezing/pushing. Audit all listed consumers at 50%.

Freeze a clean head before independent Sol review; Critical/Important findings
block merge and a head change requires a new review. Keep external exact-SHA
evidence out of the frozen manifest. Run history locally and explicit PR diff
validation in CI; escalate after three same-cause failures.
