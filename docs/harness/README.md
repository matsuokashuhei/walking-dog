# Harness Engineering

This directory is the repository-local system of record for walking-dog harness work.
Harness artifacts define what a user journey must prove before implementation is
treated as complete.

## Read Order

1. Product principles: `docs/product/principles.md`
2. Domain rules: `docs/harness/domain-rules.md`
3. Harness architecture: `docs/architecture/harness-first-development.md`
4. Local runbook: `docs/runbooks/local-harness.md`
5. Journey contracts: `docs/harness/journeys/*.md`
6. Quality score and lessons: `docs/harness/quality-score.md`,
   `docs/harness/lessons-learned.md`

## Review Gate

Every product change should name:

- Product axis: dog experience, data-maximized walks, or owner contribution.
- Journey evidence: the journey file and executable harness proof.
- Observability evidence: logs, screenshots, request IDs, or test output.
- Architecture gate result: pass or needs work, with the boundary checked.

The pull request template and `walking-dog-agent-review` skill encode this gate.
