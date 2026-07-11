# Use Testcontainers as the single development and test harness

Walking Dog uses a repository-owned Testcontainers runtime as the only source of
truth for development services, adapter integration tests, GraphQL journeys, and
Mobile/Maestro harness runs. We rejected preserving Docker Compose for API tests
and rejected a Testcontainers/Compose hybrid because reproducibility, isolation,
contract fidelity, diagnostics, and topology-drift prevention matter more than
reusing the existing orchestration; production Compose remains solely a
deployment artifact.

Migration cost and the amount of existing code replaced were explicitly not
constraints in this decision.

## Consequences

The harness must provide a resident runner, leases, typed connection manifests,
health-based waits, stale-resource cleanup, and sanitized evidence bundles so
Mobile and human-driven sessions can use the same runtime as automated tests.
Testcontainers remains tools-only and is mechanically forbidden from production
dependency graphs. Development `apps/compose.yml` and its shell wrappers are
removed when the architecture kernel cuts over.
