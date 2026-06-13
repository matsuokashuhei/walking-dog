# Harness Quality Score

Baseline date: 2026-06-13.

Grades are review heuristics, not production health metrics.

| Area | Grade | Current state | Known gaps |
| --- | --- | --- | --- |
| Product principles | B+ | Three product axes are explicit and now tied to PR evidence. | Dog-to-dog relationship evidence is still mostly implied by dog/profile/walk data. |
| Domain boundaries | B+ | Walk goals, track points, walk lifecycle/read models, storage, and legal hosting have clear owner modules. | Review discipline still depends on humans until harness checks cover these boundaries. |
| API reliability | B | Service tests exist for goals, storage, walk lifecycle, and read models. | Auth/onboarding, SQS retry evidence, and end-to-end observability are not yet first-class harness artifacts. |
| Mobile UX | B | Expo Router screens, native-feeling controls, secure storage, and tokenized styling are established. | Full Maestro coverage is only skeleton-level; seeded data and permission fixtures are missing. |
| Journey harness | C | Six journey contracts and executable Maestro skeletons exist. | Data seeding, GPS replay, camera fixtures, and CI execution are not implemented. |
| Security and privacy | B | Secure token storage, Cognito, S3 gateway boundaries, and legal URLs are documented. | PR evidence must consistently prove no sensitive token/photo/PII leakage in logs. |
| Observability | C+ | Runbook names logs and command output required for evidence. | No structured correlation ID or standardized harness report format yet. |

## Next Cleanup Targets

1. Add deterministic local seed data for authenticated owner, dogs, goals, walks,
   events, and history.
2. Add stable mobile `testID` or accessibility labels where Maestro currently
   depends on visible English text.
3. Add GPS replay and permission setup for walk lifecycle harnesses.
4. Add camera/photo fixture support for photo event harnesses.
5. Add an architecture-boundary checklist to API and mobile code review routines.
6. Standardize observability capture so each journey emits command output, logs,
   and screenshots in a predictable location.
