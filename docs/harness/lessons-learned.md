# Lessons Learned

Date: 2026-06-13.

- Product axes must be attached to evidence, not only mentioned in prose. Journey
  docs and PRs should show how the user saw dog experience, walk data, or owner
  contribution improve.
- Walk goals are minutes over a cycle. Distance belongs to stats and route history,
  not goal storage or goal editing.
- GraphQL should stay thin. If a change needs active-walk checks, distance
  finalization, aggregate SQL, storage policy, or DynamoDB item shape, the service
  boundary is probably the right home.
- Harness flows need stable selectors. Current skeletons can run against visible
  English labels, but durable CI needs explicit `testID` or accessibility labels.
- Local API verification should bind-mount the current worktree and isolate Cargo
  target cache when multiple worktrees use `apps/compose.yml`.
- Legal URL behavior belongs to the Sakura/Caddy hosting path. App behavior should
  keep pointing to `/terms` and `/policy` unless the hosting architecture changes.
- Do not hide failures in harness work. If a journey cannot be proven because seed
  data, GPS replay, camera fixtures, or logging is missing, record that as the
  next harness gap.
