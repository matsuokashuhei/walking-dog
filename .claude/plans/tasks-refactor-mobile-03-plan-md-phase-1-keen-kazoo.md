# Phase 1: 共有フック/定数抽出 (apps/mobile)

## Context

`tasks/refactor/mobile/03-plan.md` Phase 1 の実行。`apps/mobile` に 4 種類の DRY 違反が蓄積している:

1. `useAuthStore((s) => s.isAuthenticated)` — 6 ファイル 7 箇所で重複
2. `invalidateQueries({ queryKey: meKeys.all })` + `dogKeys.all` のペア — 8 箇所で類似パターン
3. `EVENT_EMOJIS` 定数マップ — `components/walk/WalkMap.tsx` と `app/walks/[id].tsx` に同一リテラル
4. Hero テキスト inline style — 8 画面で `fontSize: 40, fontWeight: '900', letterSpacing: -0.8, lineHeight: 44` を重複

共通フック/トークン/定数モジュールに抽出し、呼び出し側を置換する。TDD で進める (RED → GREEN → REFACTOR)。

## Worktree Setup

Docker Compose は `./apps/*` をマウントする想定だが、mobile サービスは現在 compose に無く、npm/jest はホスト or `docker run -v` 直接実行。worktree と main repo で Metro を同時起動しないよう注意。

```bash
cd /Users/matsuokashuhei/Development/walking-dog
git worktree add .worktrees/refactor-mobile-phase-1 -b refactor/mobile-phase-1
cd .worktrees/refactor-mobile-phase-1
```

## Files to Create

| Path | Purpose |
|------|---------|
| `apps/mobile/hooks/use-is-authenticated.ts` | `useAuthStore((s) => s.isAuthenticated)` wrapper |
| `apps/mobile/hooks/use-is-authenticated.test.ts` | hook 単体テスト |
| `apps/mobile/hooks/use-invalidate-user-queries.ts` | `meKeys.all + dogKeys.all` 並列 invalidator |
| `apps/mobile/hooks/use-invalidate-user-queries.test.ts` | hook 単体テスト |
| `apps/mobile/lib/walk/event-emojis.ts` | `EVENT_EMOJIS: Record<WalkEventType, string>` 統合 export |
| `apps/mobile/lib/walk/event-emojis.test.ts` | emoji マップ shape テスト |

## Files to Modify

### typography.hero トークン追加
- `apps/mobile/theme/tokens.ts` — `typography.hero: { fontSize: 40, fontWeight: '900', lineHeight: 44, letterSpacing: -0.8 }` 追加
- `apps/mobile/theme/tokens.test.ts` — hero token の値検証テスト追加

### use-is-authenticated 置換対象 (7箇所)
- `apps/mobile/hooks/use-dog-friends.ts:9`
- `apps/mobile/hooks/use-dog-encounters.ts:9`
- `apps/mobile/hooks/use-me.ts:9`
- `apps/mobile/hooks/use-friendship.ts:9`
- `apps/mobile/hooks/use-walks.ts:9,21`
- `apps/mobile/app/invite/[token].tsx:59`

### use-invalidate-user-queries 置換対象 (8箇所)
- `apps/mobile/hooks/use-dog-mutations.ts:28-30, 44-47, 58-61` (3 mutation)
- `apps/mobile/hooks/use-dog-member-mutations.ts:38-41, 55-58` (2 mutation)
- `apps/mobile/hooks/use-accept-invitation.ts:17-20`
- `apps/mobile/hooks/use-profile-mutation.ts:17-19`
- `apps/mobile/components/settings/EncounterDetectionSection.tsx:27-29`

**設計判断**: `meKeys.all` 単独のサイト (use-dog-mutations:useCreateDog, use-profile-mutation, EncounterDetectionSection) も新 helper に統合する。dog queries の余分な refetch は許容 (Phase 1 plan の grep 基準: `hooks` 配下から `meKeys.all` 直接呼び出し消失)。

### event-emojis 置換対象 (2箇所)
- `apps/mobile/components/walk/WalkMap.tsx:9-13` — ローカル定義削除 → import
- `apps/mobile/app/walks/[id].tsx:13-17` — 同上

### typography.hero 置換対象 (8箇所)
- `apps/mobile/components/walk/WalkReadyView.tsx:70`
- `apps/mobile/app/(auth)/register.tsx:88`
- `apps/mobile/app/(auth)/login.tsx:44`
- `apps/mobile/app/(tabs)/dogs.tsx:100`
- `apps/mobile/app/(tabs)/settings.tsx:71`
- `apps/mobile/app/dogs/[id]/encounters.tsx:61`
- `apps/mobile/app/dogs/[id]/friends/index.tsx:65`
- `apps/mobile/app/dogs/[id]/friends/[friendDogId].tsx:113`

各 style を `{ ...typography.hero, marginBottom: spacing.md }` 形式にリファクタ。既存 `bentoValue: { ...typography.display, ... }` (dogs.tsx:119) と同じスプレッド+オーバーライドパターンを踏襲。

## TDD 実行順 (superpowers:test-driven-development)

**注**: 各ステップは RED (失敗するテスト) → GREEN (最小実装) → REFACTOR (呼び出し側置換) の順。

### Step 1 — `use-is-authenticated`
1. RED: `use-is-authenticated.test.ts` 作成 — auth store の `isAuthenticated` フラグを返すことを検証 (Zustand store を mock)
2. GREEN: hook 実装
3. REFACTOR: 7 箇所を置換

### Step 2 — `use-invalidate-user-queries`
1. RED: test 作成 — `invalidateQueries` が `meKeys.all` と `dogKeys.all` の両方で呼ばれることを検証 (QueryClientProvider wrapper + spy)
2. GREEN: hook 実装 (`useCallback` + `Promise.all` で並列 invalidate)
3. REFACTOR: 8 箇所を置換

### Step 3 — `lib/walk/event-emojis.ts`
1. RED: test 作成 — `EVENT_EMOJIS.pee / poo / photo` の値検証
2. GREEN: `export const EVENT_EMOJIS: Record<WalkEventType, string> = { pee: '🚽', poo: '💩', photo: '📷' };`
3. REFACTOR: WalkMap + walks/[id] から local 定義削除 → import

### Step 4 — `typography.hero` トークン
1. RED: `tokens.test.ts` に hero token 検証 追加
2. GREEN: `tokens.ts` に hero 追加
3. REFACTOR: 8 style entries をスプレッド形式に置換

## 既存ユーティリティの再利用

- `useQueryClient()` from `@tanstack/react-query` — 既存 mutation hook と同じ access pattern (ref: `use-dog-mutations.ts:21-31`)
- `meKeys.all`, `dogKeys.all` — `apps/mobile/lib/graphql/keys.ts:1-27` の既存 exports
- `typography.display` spread pattern — `app/(tabs)/dogs.tsx:119` を踏襲
- Hook test convention — `apps/mobile/hooks/use-accept-invitation.test.ts` のパターン (Jest + `@testing-library/react-native` + `QueryClientProvider` wrapper)

## 完了条件 (plan §Phase 1)

- 全既存テスト緑 + 新規テスト緑
- `rg "useAuthStore\(\(s\) => s\.isAuthenticated\)" apps/mobile/hooks` が `use-is-authenticated.ts` 1 件のみ
- `rg "invalidateQueries\(\{ queryKey: meKeys\.all" apps/mobile/hooks` が `use-invalidate-user-queries.ts` 内のみ
- `rg "EVENT_EMOJIS" apps/mobile/{components,app}` が import 行のみ (local 定義なし)
- `rg "fontSize: 40," apps/mobile/app apps/mobile/components` が 0 件 (hero token 参照のみ)

## 検証コマンド

worktree ディレクトリで実行:

```bash
cd apps/mobile
npm test                      # jest suite 全緑
npx tsc --noEmit              # 型エラーなし
npm run lint                  # ESLint 通過
```

完了条件 grep 確認:

```bash
cd /Users/matsuokashuhei/Development/walking-dog/.worktrees/refactor-mobile-phase-1
rg "useAuthStore\(\(s\) => s\.isAuthenticated\)" apps/mobile/hooks
rg "invalidateQueries\(\{ queryKey: meKeys\.all" apps/mobile/hooks
rg "EVENT_EMOJIS" apps/mobile/components apps/mobile/app
rg "fontSize: 40," apps/mobile/app apps/mobile/components
```

iOS Simulator スモーク (`ios-simulator-skill`):
- 起動 → login 画面 (hero style)
- dogs tab → settings tab (hero title)
- 犬詳細 → friends / encounters 遷移 (hero title)
- 散歩開始 → WalkMap にイベントマーカーが表示されるか (EVENT_EMOJIS)

## 完了後処理

1. Conventional Commit: `refactor(mobile): extract shared hooks and tokens for DRY cleanup`
2. `tasks/refactor/mobile/progress.md` の Phase 1 行を `- [x]` に更新 (worktree 側で編集 → main に反映は最終コミット or PR 後)
3. `finishing-a-development-branch` skill で PR 作成検討

## 依存 / リスク

- **依存**: なし (Phase 1 は他フェーズに blocking)
- **リスク**: 低
  - invalidate helper で `meKeys.all` 単独サイトも both invalidate になる (意図的トレードオフ)
  - hero token 置換時に `marginBottom` / `textAlign` の override 忘れでレイアウト崩れの可能性 → Simulator スモークで検出
