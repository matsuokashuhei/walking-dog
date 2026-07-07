# Journey: Walk Lifecycle

## Product Axes

- 犬の体験: the selected dog or pack gets a real outing.
- データによる散歩の最大化: route, elapsed time, active state, and completion are captured.
- 飼い主の貢献心: completed walks become proof of care.
- Dog experience: records an actual outing for the selected dog or pack.
- Data-maximized walks: captures start, active state, GPS points, elapsed time,
  distance finalization, and completion.
- Owner contribution: turns a completed walk into visible proof that the owner did
  something valuable for the dog.

## Scope

An authenticated owner selects dog(s), starts a walk, records location over time,
pauses/resumes if needed, ends the walk, and lands on the saved walk detail.

## Acceptance Criteria

- Start requires at least one selected dog.
- Only the owning user can start, update, or finish the active walk.
- The active walk route keeps the same map shell and does not remount during normal
  START to recording transition.
- Foreground GPS is used when foreground permission exists.
- Background GPS starts only when background permission exists.
- Track points flow through `TrackPointRepository`.
- Finish finalizes distance and duration through `service::walk`.
- Ending the walk opens the saved walk detail directly, without a post-walk save
  screen.
- Completed walk appears in user and dog history.
- Failure to start or finish surfaces an error and does not create fake progress.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/walk-lifecycle.yaml`.
- API: start/finish GraphQL evidence and service tests for lifecycle rules.
- Worker/storage: track-point worker logs when GPS queue behavior is touched.
- Mobile: screenshot or video of ready, recording, and completed states.
