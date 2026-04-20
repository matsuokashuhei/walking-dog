# End Walk post-stop tracking investigation

- [completed] Trace summary map motion on the finished walk screen
- [completed] Fix shared tracking cleanup across walk screens
- [completed] Add regression tests for cross-screen stop behavior
- [completed] Verify the fix with tests and iOS simulator repro

## Review

- Root cause: `useWalkSession()` originally stored the GPS cleanup function in hook-local state, while walk start and walk stop run from different screens and therefore different hook instances. That let the active `watchPositionAsync` subscription survive End Walk until tracking cleanup was shared across screens.
- Current design: tracking session generation and cleanup now live in [apps/mobile/stores/walk-store.ts](/Users/matsuokashuhei/Development/walking-dog/apps/mobile/stores/walk-store.ts), while GPS subscription lifecycle and batch flushing live in [apps/mobile/lib/walk/tracking-manager.ts](/Users/matsuokashuhei/Development/walking-dog/apps/mobile/lib/walk/tracking-manager.ts). [apps/mobile/hooks/use-walk-session.ts](/Users/matsuokashuhei/Development/walking-dog/apps/mobile/hooks/use-walk-session.ts) no longer owns module-scope tracking globals.
- Verification: targeted Jest suites passed, and two simulator screenshots of the finished summary taken about one minute apart stayed identical aside from the status-bar clock.

## mobile-cleanup kickoff

- [completed] Confirm Phase A-K plan source in `.claude/plans/apps-mobile-ticklish-rossum.md`
- [completed] Create branch `refactor/mobile-cleanup`
- [completed] Initialize `tasks/refactor/mobile-cleanup/progress.md`
- [completed] Prepare next-session handoff for Phase A via tdd-workflow

## Phase A execution

- [completed] Add RED tests for shared walk formatters
- [completed] Replace local duration/distance/date formatters with shared helpers
- [completed] Run Phase A verification commands and grep guards
- [completed] Update `tasks/refactor/mobile-cleanup/progress.md`

## Phase A verification notes

- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- lib/walk/format` passed after shared formatter extraction.
- `grep -REn "toLocaleDateString|toLocaleString\(" apps/mobile/app apps/mobile/components apps/mobile/hooks` returned no matches.
- `grep -REn "^function format(Duration|Distance|Pace)" apps/mobile/app apps/mobile/components` returned no matches.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed after aligning test typings in `hooks/use-walk-session.test.ts` and `lib/graphql/errors.test.ts`.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with pre-existing warnings only.

## mobile-cleanup Phase C

- [x] Remove `app-example` references from mobile config/docs
- [x] Delete Expo starter leftovers (`app-example/`, `reset-project` script)
- [x] Run Phase C verification (`rg`, typecheck)
- [x] Update progress notes

## mobile-cleanup Phase E

- [x] Add RED tests for shared elapsed timer hook
- [x] Refactor `WalkControls` and `WalkMinimizedControls` to use the shared hook
- [x] Run Phase E verification (`npm test`, `typecheck`, grep guard)
- [x] Update `tasks/refactor/mobile-cleanup/progress.md` and review notes

## mobile-cleanup Phase F

- [x] Add RED tests for `use-walk-event-recorder` and `use-camera-event-trigger`
- [x] Extract `EventPill`, `use-walk-event-recorder`, and `use-camera-event-trigger`
- [x] Refactor `WalkEventActions` to UI orchestration only
- [x] Run Phase F verification (`npm test`, `typecheck`, `lint`)
- [x] Update `tasks/refactor/mobile-cleanup/progress.md` and review notes

## mobile-cleanup Phase H

- [x] Add RED tests for extracted walk control presentation components
- [x] Extract shared `Metric` into `components/ui/Metric.tsx`
- [x] Split `WalkControls.tsx` into smaller presentational sections and keep it under 150 lines
- [x] Run Phase H verification (`npm test`, `typecheck`, `lint`, line-count guard)
- [x] Update `tasks/refactor/mobile-cleanup/progress.md` and review notes

## mobile-cleanup Phase I

- [x] Confirm current auth/settings initialization boundaries in `app/_layout.tsx`, `stores/auth-store.ts`, and `stores/settings-store.ts`
- [x] Add RED tests for `lib/auth/bootstrap.ts` and `lib/storage/async-storage.ts`
- [x] Extract auth initialization orchestration into `lib/auth/bootstrap.ts`
- [x] Add typed AsyncStorage wrapper in `lib/storage/async-storage.ts`
- [x] Refactor `auth-store.ts` and `settings-store.ts` so stores keep state transitions and delegate I/O/orchestration
- [x] Update or add store tests so bootstrap logic moves out of `auth-store.test.ts` and settings behavior is covered
- [x] Run Phase I verification (`npm test`, `typecheck`, `lint`)
- [x] Update `tasks/refactor/mobile-cleanup/progress.md` with Phase I results and review notes

## Phase I review targets

- `auth-store.test.ts` should shrink by moving initialize-specific behavior into bootstrap tests
- `settings-store.ts` should stop calling `AsyncStorage` directly
- `app/_layout.tsx` should keep the same startup behavior after the refactor

## mobile-cleanup Phase J

- [x] Add RED tests for five screen view models (`walk`, `walk detail`, `dogs`, `dog detail`, `settings`)
- [x] Extract screen view models so app screens keep rendering and navigation wiring only
- [x] Extend `use-walk-detail-view-model` so formatted walk detail state leaves the screen
- [x] Add missing `components/dogs/` tests for `DogStatsCard`, `EncounterCard`, `DogWalkRow`, and `PackRollupCard`
- [x] Run Phase J verification (`npm test`, `typecheck`, `lint`)
- [x] Update `tasks/refactor/mobile-cleanup/progress.md` with Phase J notes

## mobile-cleanup Phase K

- [x] Add RED tests for named theme radius/shadow tokens and token-backed component styles
- [x] Add `radius.appMark`, `radius.pill`, and `shadow.primary` to `theme/tokens.ts`
- [x] Replace targeted hardcoded radius/color values in `AppMark`, `Button`, `Tag`, `WalkEventTimeline`, and `ProfileCard`
- [x] Run Phase K verification (`npm test`, `typecheck`, `lint`, grep guards)
- [x] Update `tasks/refactor/mobile-cleanup/progress.md` with Phase K notes
