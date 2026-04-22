# Progress: mobile-cleanup

計画元: `.claude/plans/apps-mobile-ticklish-rossum.md`

各 Phase 完了後に `[x]` + 日付 + コミットハッシュ + メモ を追記すること。

- [x] Phase A: 共通フォーマッタ集約 (2026-04-19, uncommitted, formatter/date helpers unified and verification complete)
- [x] Phase B: 認証エラー型化 (2026-04-19, uncommitted, typed auth error normalization added at the auth API boundary and auth form string matching removed)
- [x] Phase C: app-example/ 削除 (2026-04-19, uncommitted, Expo starter leftovers removed and active-tree app-example/reset-project references cleared)
- [x] Phase D: walk event エラーハンドリング統一 (2026-04-19, uncommitted, walk event mutations now flow through the shared alert helper with Sentry reporting and quick-actions regression coverage)
- [x] Phase E: タイマー hook 共通化 (2026-04-20, uncommitted, shared elapsed timer hook now drives both WalkControls variants with pause/resume coverage)
- [x] Phase F: WalkEventActions.tsx 分解 (2026-04-20, uncommitted, WalkEventActions now composes extracted event/camera hooks plus presentational action rows while preserving existing behavior)
- [x] Phase G: walk-session グローバル除去 (2026-04-20, tracking session state moved into walk-store and GPS lifecycle/flush orchestration extracted to tracking-manager)
- [x] Phase H: WalkControls.tsx 分解 (2026-04-20, uncommitted, WalkControls now composes extracted header/metrics/actions sections plus shared Metric and stays at 100 lines)
- [x] Phase I: stores の責務分離 (2026-04-20, uncommitted, auth bootstrap orchestration and typed AsyncStorage helpers extracted so auth/settings stores stay focused on state transitions)
- [x] Phase J: app/ ViewModel 抽出とテスト補強 (2026-04-20, uncommitted, tab/detail screens now delegate orchestration to dedicated view-model hooks and dogs component coverage was expanded)
- [x] Phase K: テーマトークン統合 (2026-04-20, uncommitted, named radius/shadow tokens added and targeted mobile hardcodes replaced without increasing lint warnings)

Notes:
- 2026-04-19: Phase A completed on `refactor/mobile-cleanup` after fixing TypeScript test typing in `apps/mobile/hooks/use-walk-session.test.ts` and `apps/mobile/lib/graphql/errors.test.ts`.
- 2026-04-19: Phase B completed on `refactor/mobile-cleanup` with `apps/mobile/lib/auth/errors.ts`, API-level auth error normalization in `apps/mobile/lib/auth/api.ts`, auth form updates in `apps/mobile/components/auth/*Form.tsx`, and added auth-focused component/unit tests.
- 2026-04-19: Phase C completed on `refactor/mobile-cleanup` by deleting `apps/mobile/app-example/`, removing the Expo starter `reset-project` helper, and cleaning related config/doc references. Scoped `rg "app-example" apps/mobile` and `rg "reset-project" apps/mobile` returned no active-tree matches.
- 2026-04-19: Phase D completed on `refactor/mobile-cleanup` by extending `apps/mobile/hooks/use-mutation-with-alert.ts` to support error-to-message resolution and Sentry reporting, then routing `apps/mobile/components/walk/WalkEventActions.tsx` and `apps/mobile/components/walk/WalkQuickActions.tsx` through the shared helper instead of per-component `console.error` branches.
- 2026-04-19: Added `apps/mobile/components/walk/WalkQuickActions.test.tsx` and expanded walk alert-hook coverage to lock record/photo failure behavior before refactoring `WalkEventActions` further in Phase F.
- 2026-04-20: Phase E completed on `refactor/mobile-cleanup` by adding `apps/mobile/hooks/use-walk-elapsed.ts`, covering pause/resume behavior in `apps/mobile/hooks/use-walk-elapsed.test.ts`, and moving elapsed-timer updates out of `apps/mobile/components/walk/WalkControls.tsx` and `apps/mobile/components/walk/WalkMinimizedControls.tsx`.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- lib/walk/format` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with pre-existing warnings only.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- hooks/use-mutation-with-alert.test.ts components/walk/WalkEventActions.test.tsx components/walk/WalkQuickActions.test.tsx` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- hooks/use-walk-elapsed.test.ts components/walk/WalkControls.test.tsx components/walk/WalkMinimizedControls.test.tsx` passed.
- 2026-04-20: Phase F completed on `refactor/mobile-cleanup` by extracting `apps/mobile/hooks/use-walk-event-recorder.ts`, `apps/mobile/hooks/use-camera-event-trigger.ts`, `apps/mobile/components/walk/EventPill.tsx`, and `apps/mobile/components/walk/DogEventActionRow.tsx`, then reducing `apps/mobile/components/walk/WalkEventActions.tsx` to UI orchestration plus permission/camera launch wiring.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- hooks/use-walk-event-recorder.test.ts hooks/use-camera-event-trigger.test.ts components/walk/WalkEventActions.test.tsx` passed after aligning the photo-upload payload back to `lat`/`lng` only.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed after Phase F; Jest still reports the pre-existing React Query `act(...)` warnings and worker teardown warning, but no failing suites.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed after Phase F.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` returned the existing 7 warnings only after removing the temporary unused import introduced in `apps/mobile/components/walk/DogEventActionRow.tsx`.
- 2026-04-20: Phase G completed on `refactor/mobile-cleanup` by moving tracking generation/cleanup into `apps/mobile/stores/walk-store.ts`, extracting `apps/mobile/lib/walk/tracking-manager.ts`, and removing `use-walk-session.ts` module-scope tracking globals.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- stores/walk-store.test.ts lib/walk/tracking-manager.test.ts hooks/use-walk-session.test.ts` passed for Phase G.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- lib/walk/tracking-manager.test.ts` passed after tightening test callback typing.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed after Phase G; Jest still reports the pre-existing React Query `act(...)` warnings and worker teardown warning, but no failing suites.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed after Phase G.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with the existing 7 warnings only after Phase G.
- Scoped active-tree search confirmed `activeTrackingCleanup` and `activeTrackingGeneration` no longer appear under `apps/mobile`.
- Scoped active-tree search confirmed `walk event record failed` no longer appears under `apps/mobile/components/walk`.
- 2026-04-20: Phase H completed on `refactor/mobile-cleanup` by extracting `apps/mobile/components/ui/Metric.tsx`, `apps/mobile/components/walk/WalkIdentityHeader.tsx`, `apps/mobile/components/walk/WalkMetricsRow.tsx`, and `apps/mobile/components/walk/WalkControlsActions.tsx`, then reducing `apps/mobile/components/walk/WalkControls.tsx` to orchestration-only state and derived-metrics logic.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- components/ui/Metric.test.tsx components/walk/WalkIdentityHeader.test.tsx components/walk/WalkControls.test.tsx components/walk/WalkMinimizedControls.test.tsx` passed for Phase H.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed after Phase H; Jest still reports the pre-existing React Query `act(...)` warnings and worker teardown warning, but no failing suites.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed after Phase H.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with the existing 7 warnings only after Phase H.
- `wc -l apps/mobile/components/walk/WalkControls.tsx` returned `100 apps/mobile/components/walk/WalkControls.tsx` after Phase H.
- 2026-04-20: Phase I completed on `refactor/mobile-cleanup` by extracting `apps/mobile/lib/auth/bootstrap.ts` and `apps/mobile/lib/storage/async-storage.ts`, shrinking auth-store initialization duties, and moving settings persistence behind typed storage helpers with dedicated bootstrap/storage/settings tests.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- lib/auth/bootstrap.test.ts lib/storage/async-storage.test.ts stores/auth-store.test.ts stores/settings-store.test.ts` passed for Phase I.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed after Phase I; Jest still reports the pre-existing React Query `act(...)` warnings and worker teardown warning, but no failing suites.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed after Phase I.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with the existing 7 warnings only after Phase I.
- 2026-04-20: Phase J completed on `refactor/mobile-cleanup` by adding `apps/mobile/hooks/use-walk-screen-view-model.ts`, `apps/mobile/hooks/use-dogs-screen-view-model.ts`, `apps/mobile/hooks/use-settings-screen-view-model.ts`, and `apps/mobile/hooks/use-dog-detail-view-model.ts`, extending `apps/mobile/hooks/use-walk-detail-view-model.ts`, refactoring the `walk`, `dogs`, `settings`, `dog detail`, and `walk detail` app screens to consume those hooks, and adding missing `components/dogs/*` coverage for `DogStatsCard`, `EncounterCard`, `DogWalkRow`, and `PackRollupCard`.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- hooks/use-walk-screen-view-model.test.ts hooks/use-dogs-screen-view-model.test.ts hooks/use-settings-screen-view-model.test.ts hooks/use-dog-detail-view-model.test.ts hooks/use-walk-detail-view-model.test.ts components/dogs/DogStatsCard.test.tsx components/dogs/EncounterCard.test.tsx components/dogs/DogWalkRow.test.tsx components/dogs/PackRollupCard.test.tsx __tests__/app/tabs/dogs.test.tsx __tests__/app/dogs/dog-detail.test.tsx __tests__/app/tabs/settings.test.tsx __tests__/app/walks/[id].test.tsx __tests__/app/walks/walk-detail.test.tsx` passed for Phase J after quoting the dynamic-route test path for zsh.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed after Phase J; Jest still reports the pre-existing React Query `act(...)` warnings and worker teardown warning, but no failing suites.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed after Phase J.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with the existing 7 warnings only after Phase J.
- 2026-04-20: Phase K completed on `refactor/mobile-cleanup` by adding `radius.appMark`, `radius.pill`, and `shadow.primary` in `apps/mobile/theme/tokens.ts`, then replacing the targeted `borderRadius: 22`, `borderRadius: 100`, `'#0a84ff'`, and `'#fff'` component hardcodes with shared token/theme references in `AppMark`, `Button`, `Tag`, `WalkEventTimeline`, and `ProfileCard`.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- theme/tokens.test.ts components/auth/AppMark.test.tsx components/ui/Tag.test.tsx components/ui/Button.test.tsx` passed for Phase K after the RED/GREEN token checks were added.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed after Phase K; Jest still reports the pre-existing React Query `act(...)` warnings and worker teardown warning, but no failing suites.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed after Phase K.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with 5 pre-existing warnings only after Phase K.
- Scoped active-tree search confirmed `borderRadius:\s*(22|100)` no longer appears under `apps/mobile` and `'#0a84ff'|'#fff'` no longer appears under `apps/mobile/components` outside the archived worktree.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed after Phase E; Jest still reports pre-existing React Query `act(...)` warnings and a worker teardown warning, but no failing suites.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` returned the existing 7 warnings only after removing the new `WalkControls.tsx` dependency warning introduced during Phase E.
- Manual iOS Simulator verification for offline alert display was not run in this session.
