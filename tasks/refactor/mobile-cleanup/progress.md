# Progress: mobile-cleanup

計画元: `.claude/plans/apps-mobile-ticklish-rossum.md`

各 Phase 完了後に `[x]` + 日付 + コミットハッシュ + メモ を追記すること。

- [x] Phase A: 共通フォーマッタ集約 (2026-04-19, uncommitted, formatter/date helpers unified and verification complete)
- [x] Phase B: 認証エラー型化 (2026-04-19, uncommitted, typed auth error normalization added at the auth API boundary and auth form string matching removed)
- [x] Phase C: app-example/ 削除 (2026-04-19, uncommitted, Expo starter leftovers removed and active-tree app-example/reset-project references cleared)
- [x] Phase D: walk event エラーハンドリング統一 (2026-04-19, uncommitted, walk event mutations now flow through the shared alert helper with Sentry reporting and quick-actions regression coverage)
- [ ] Phase E: タイマー hook 共通化
- [ ] Phase F: WalkEventActions.tsx 分解
- [ ] Phase G: walk-session グローバル除去
- [ ] Phase H: WalkControls.tsx 分解
- [ ] Phase I: stores の責務分離
- [ ] Phase J: app/ ViewModel 抽出とテスト補強
- [ ] Phase K: テーマトークン統合

Notes:
- 2026-04-19: Phase A completed on `refactor/mobile-cleanup` after fixing TypeScript test typing in `apps/mobile/hooks/use-walk-session.test.ts` and `apps/mobile/lib/graphql/errors.test.ts`.
- 2026-04-19: Phase B completed on `refactor/mobile-cleanup` with `apps/mobile/lib/auth/errors.ts`, API-level auth error normalization in `apps/mobile/lib/auth/api.ts`, auth form updates in `apps/mobile/components/auth/*Form.tsx`, and added auth-focused component/unit tests.
- 2026-04-19: Phase C completed on `refactor/mobile-cleanup` by deleting `apps/mobile/app-example/`, removing the Expo starter `reset-project` helper, and cleaning related config/doc references. Scoped `rg "app-example" apps/mobile` and `rg "reset-project" apps/mobile` returned no active-tree matches.
- 2026-04-19: Phase D completed on `refactor/mobile-cleanup` by extending `apps/mobile/hooks/use-mutation-with-alert.ts` to support error-to-message resolution and Sentry reporting, then routing `apps/mobile/components/walk/WalkEventActions.tsx` and `apps/mobile/components/walk/WalkQuickActions.tsx` through the shared helper instead of per-component `console.error` branches.
- 2026-04-19: Added `apps/mobile/components/walk/WalkQuickActions.test.tsx` and expanded walk alert-hook coverage to lock record/photo failure behavior before refactoring `WalkEventActions` further in Phase F.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- lib/walk/format` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with pre-existing warnings only.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- hooks/use-mutation-with-alert.test.ts components/walk/WalkEventActions.test.tsx components/walk/WalkQuickActions.test.tsx` passed.
- Scoped active-tree search confirmed `walk event record failed` no longer appears under `apps/mobile/components/walk`.
- Manual iOS Simulator verification for offline alert display was not run in this session.
