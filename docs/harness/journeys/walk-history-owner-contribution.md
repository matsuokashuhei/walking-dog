# Journey: Walk History And Owner Contribution

## Product Axes

- 犬の体験: each dog keeps a walk record that informs future care.
- データによる散歩の最大化: history and aggregates turn walks into reusable insight.
- 飼い主の貢献心: progress and history make the owner's contribution visible.
- Dog experience: preserves each dog's walk record so future decisions can consider
  recent activity and patterns.
- Data-maximized walks: reads history, totals, goal progress, route, event, and
  duration data from the canonical read models.
- Owner contribution: makes the owner's care visible through weekly progress,
  totals, and saved walk history.

## Scope

After walks are saved, the owner reviews dog detail history, walk detail, and the
Me tab contribution summary.

## Acceptance Criteria

- Dog detail history lists walks for that dog only.
- User history and Me summary reflect the owner's saved walks.
- Walk detail shows route, dogs, walker, start/end, duration, and events.
- Goal progress uses time-based goals and completed walk duration.
- Pagination totals and aggregate stats come from `service::walk_read_model`.
- Empty and error states do not show misleading zero progress when history fails to
  load.
- Owner-facing copy and metrics encourage continued walking rather than generic
  activity tracking.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/walk-history-owner-contribution.yaml`.
- API: walk read-model tests or GraphQL query evidence for dog and user history.
- Mobile: screenshots of Dog Profile history, Walk Detail, and Me weekly summary.
- Observability: API logs for history queries and any aggregate SQL path touched.
