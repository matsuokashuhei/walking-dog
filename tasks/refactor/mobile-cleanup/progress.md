# Progress: mobile-cleanup

計画元: `.claude/plans/apps-mobile-ticklish-rossum.md`

各 Phase 完了後に `[x]` + 日付 + コミットハッシュ + メモ を追記すること。

- [x] Phase A: 共通フォーマッタ集約 (2026-04-19, uncommitted, formatter/date helpers unified and verification complete)
- [ ] Phase B: 認証エラー型化
- [ ] Phase C: app-example/ 削除
- [ ] Phase D: walk event エラーハンドリング統一
- [ ] Phase E: タイマー hook 共通化
- [ ] Phase F: WalkEventActions.tsx 分解
- [ ] Phase G: walk-session グローバル除去
- [ ] Phase H: WalkControls.tsx 分解
- [ ] Phase I: stores の責務分離
- [ ] Phase J: app/ ViewModel 抽出とテスト補強
- [ ] Phase K: テーマトークン統合

Notes:
- 2026-04-19: Phase A completed on `refactor/mobile-cleanup` after fixing TypeScript test typing in `apps/mobile/hooks/use-walk-session.test.ts` and `apps/mobile/lib/graphql/errors.test.ts`.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run typecheck` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm test -- lib/walk/format` passed.
- `docker compose -f compose.yml -f mobile.yml run --rm mobile npm run lint` completed with pre-existing warnings only.
