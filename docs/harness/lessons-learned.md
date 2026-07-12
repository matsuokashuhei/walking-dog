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
- Map-overlay slide controls should not hide native value controls behind custom
  visuals. Keep the visible knob and touch responder in one component so drag
  ownership cannot leak to the map or leave native thumb artifacts visible. Also
  check the actual route that owns the UI: active walk controls live in `(tabs)/walk`,
  so `/walk-recording` stack gesture settings do not protect the in-tab overlay.
- Local API verification should bind-mount the current worktree and isolate Cargo
  target cache when multiple worktrees run the Dockerized Rust toolchain.
- Legal URL behavior belongs to the Sakura/Caddy hosting path. App behavior should
  keep pointing to `/terms` and `/policy` unless the hosting architecture changes.
- Do not hide failures in harness work. If a journey cannot be proven because seed
  data, GPS replay, camera fixtures, or logging is missing, record that as the
  next harness gap.
- Sakura's track point worker env tuning should stay boring: read an env var when
  present, otherwise use the default, and pass the value straight to
  `ConsumerOptions`. Avoid wrapper config structs and custom validation fallback
  helpers unless the worker gains a real shared configuration boundary.
