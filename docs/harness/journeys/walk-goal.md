# Journey: Walk Goal

## Product Axes

- 犬の体験: time targets encourage healthier walks for each dog.
- データによる散歩の最大化: goal minutes and cycle support progress analysis.
- 飼い主の貢献心: minute progress shows care contributed by walking.
- Dog experience: gives each dog a realistic time target for healthier walks.
- Data-maximized walks: captures goal minutes and cycle so progress can be computed
  against actual walk duration.
- Owner contribution: shows progress in minutes so owners understand how much
  walking they contributed today or this week.

## Scope

An owner sets or edits a dog's daily or weekly walk goal and sees goal progress in
the dog profile and walk surfaces.

## Acceptance Criteria

- Goal storage uses `dog_walk_goal.walk_amount.minutes` and `cycle_days`.
- `cycle_days = 1` is daily and `cycle_days = 7` is weekly.
- Distance is never used as the goal value.
- Mobile selectable ranges match API validation bounds.
- Invalid cycle values or out-of-range minutes are rejected by the API service
  layer.
- Dog detail shows progress against the current time-based goal.
- History and stats remain distance-aware, but goal progress remains time-based.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/walk-goal.yaml`.
- API: dog goal service boundary tests and GraphQL mutation evidence.
- Mobile: screenshot showing daily or weekly minutes in goal progress.
- Observability: API error evidence for an invalid goal input when the contract is
  touched.
