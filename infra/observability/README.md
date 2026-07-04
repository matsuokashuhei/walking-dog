# Local Observability Harness

This directory owns the local logs, metrics, and traces surface that Codex can query while validating a worktree.

The current harness records API journey request/response artifacts in `.harness-runs/journeys/` and exposes them through:

```bash
scripts/harness/query-observability.sh <walk-id-or-operation>
```

Target end state:

- API emits structured request logs with request id, GraphQL operation, user id, dog id, walk id, latency, and error code.
- Mobile emits structured events for GraphQL requests, walk tracking state transitions, location permission state, and background tracking outcomes.
- Local OpenTelemetry services run per worktree and can be queried by Codex before a PR is marked ready.
