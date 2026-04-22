# Refactor Plan: apps/mobile/

**対象**: `apps/mobile/` 全体
**作成日**: 2026-04-19
**スコープ**: Phase A–J 全部（ユーティリティ集約 → 責務分離 → ViewModel 抽出 → テスト補強）
**関連**: `.claude/plans/apps-mobile-valiant-lagoon.md`（前回スナップショット、残す）

---

## Context

**なぜこの変更が必要か**:
直近で walk recording (iOS 26 Liquid Glass)、Me タブリデザイン、Sentry 統合、写真アップロード、家族共有機能、犬のパックロールアップなど、短期間で大きな機能追加が続いた。結果として apps/mobile/ に以下の負債が蓄積している:

- `WalkEventActions.tsx` (340行)・`WalkControls.tsx` (300行) など 1 コンポーネント 6 責務化したファイル
- `formatDuration` / `formatDistance` がローカルで 3–5 箇所に再実装され、精度（`.toFixed(1)` vs `.toFixed(2)`）も不一致
- `toLocaleString()` が 4+ 箇所で直呼ばれ、ロケール/単位処理が一貫しない
- `hooks/use-walk-session.ts` にモジュールスコープの `activeTrackingCleanup` / `activeTrackingGeneration` があり、テストが複雑化
- `app/` 配下 19 ファイル中テスト 0 件（画面ロジックが UI に埋まっているため）
- `auth-store` / `walk-store` のテストが 282–293 行に肥大

**目標**: 機能追加をゼロにしたまま、共通ユーティリティ集約 → 責務分離 → ViewModel 抽出 → テスト補強を段階的に進める。スコープは `apps/mobile/` のみ。API・infra は触らない。

**非目標**: 新機能追加、UI デザイン変更、ネイティブモジュール改修、性能最適化。

---

## Phase 1 Scan — 課題一覧

凡例: `[原則]` `ファイル:行` — 症状

### DRY（重複）

- `[DRY]` `components/dogs/DogStatsCard.tsx:13-16` — `formatDistance` をローカル再実装、`lib/walk/format.ts` の同名関数と精度不一致（`.toFixed(1)` vs `.toFixed(2)`）
- `[DRY]` `components/dogs/EncounterCard.tsx:14-19` — `formatDuration(sec)` ローカル定義
- `[DRY]` `app/walks/[id].tsx:186-191` — `formatDuration(min)` ローカル定義（入力単位が min で別シグネチャ）
- `[DRY]` `app/dogs/[id]/friends/[friendDogId].tsx:12-17` — `formatDuration` 3 回目の再実装
- `[DRY]` `app/walks/[id].tsx:193-200` — `formatPace` ローカル定義、`lib/walk/format.ts` の同名関数と別シグネチャ
- `[DRY]` `components/walk/WalkControls.tsx` — `splitDistance`, `contextualWalkLabel` がファイル内 private
- `[DRY]` `components/walk/WalkHistoryItem.tsx:19` / `FriendCard.tsx:18` / `EncounterCard.tsx:40` / `app/dogs/[id]/friends/[friendDogId].tsx:75,83` — `toLocaleDateString()` / `toLocaleString()` が 4 ファイル 5 箇所で直呼び
- `[DRY]` `components/walk/WalkEventActions.tsx:132` / `WalkQuickActions.tsx:182` — `console.error('walk event record failed', err)` が 2 箇所で同一
- `[DRY]` `components/walk/WalkControls.tsx:34-43` / `WalkMinimizedControls.tsx:28-36` — 毎秒 `Date.now() - startedAt.getTime()` の useEffect 重複
- `[DRY]` `components/auth/LoginForm.tsx:36-41` / `RegisterForm.tsx:38-41` / `ConfirmForm.tsx:34-40` — 認証エラーの `message.includes(...)` 文字列判定が 3 箇所

### SRP（単一責任）

- `[SRP]` `components/walk/WalkEventActions.tsx:1-221` (340行) — UI 分岐（single/multi dog）+ カメラ起動 + アップロード + Live Activity リクエスト監視 + AppState 購読の 6 責務
- `[SRP]` `components/walk/WalkControls.tsx:29-204` (300行) — タイマー useEffect + ポーズ状態 + 4 フォーマッタ + 時間帯判定 + UI レイアウト
- `[SRP]` `hooks/use-walk-session.ts:1-107` — GPS トラッキング + バッチフラッシュ + Live Activity 連携 + API mutation + **モジュールスコープのグローバル変数**
- `[SRP]` `app/walk-recording-controls.tsx:15-81` — 3 session hook orchestration + API stop + bottom-sheet レイアウト計算 + ナビゲーション
- `[SRP]` `app/(tabs)/walk.tsx:40-66` — GPS 権限 → session.start → encounter flag → Bluetooth 権限 → BLE init が 1 useCallback
- `[SRP]` `stores/auth-store.ts:34-69` — store メソッド内で legacy migration + SecureStore I/O + ME_QUERY + エラー判別
- `[SRP]` `stores/settings-store.ts:29-49` — store メソッド内で AsyncStorage 3 並列読み + i18n 言語変更
- `[SRP]` `components/walk/WalkSummaryCard.tsx:18-71` (229行) — 5 派生状態計算 + 保存ノート生成 + router.push
- `[SRP]` `components/auth/ConfirmForm.tsx:17-45` / `LoginForm.tsx:27-49` / `RegisterForm.tsx:29-48` — フォーム状態 + API + エラー文字列マッチ混在
- `[SRP]` `hooks/use-accept-invite-flow.ts:31-58` — token 読取 + 認証判定 + 保存 + mutation + ナビゲーションを 1 effect

### KISS / YAGNI / その他

- `[OCP]` `components/walk/WalkEventActions.tsx` — `EVENT_ORDER` / `tallyByType` でイベント種別を 3 ヶ所ハードコード
- `[YAGNI]` `app-example/` — Expo Router デモ残骸、参照ゼロ
- `[KISS]` `AppMark.tsx:34` `borderRadius: 22`, `Tag.tsx:64` `borderRadius: 100`, `shadowColor: '#0a84ff'`, `color: '#fff'` — theme/tokens 未集約
- `[関心分離]` `settings-store.ts` は AsyncStorage 直呼び、`auth-store.ts` は secure-storage wrapper 経由で抽象レベル不統一

### テスト

- `[Test]` `app/` 19 ファイル / テスト 0 件
- `[Test]` `components/dogs/` 11 ファイル中 3 テスト（`DogWalkRow`, `DogWalksList`, `EncounterCard`, `PackRollupCard` 未カバー）
- `[Test]` `lib/walk/live-activity.ts` (105行) / `stores/settings-store.ts` — テストなし
- `[Test]` `auth-store.test.ts` (282行) / `walk-store.test.ts` (293行) — store 肥大で regression 面大

---

## Phase 2 Solutions — 採用案

### S1. `lib/walk/format.ts` に共通フォーマッタ集約

**採用**: 既存 `lib/walk/format.ts` を拡張、外部依存追加なし（KISS + DRY）。

- `formatDuration(totalSec: number): string` — `mm:ss` / `h時間m分` 統一
- `formatDistance(meters: number, units: 'km'|'mile', precision?: number)` — precision デフォルト 2
- `formatShortDate(d: Date, locale: string)`, `formatDateTime(d: Date, locale: string)` — i18n 対応

### S2. エラーハンドリング統一

**採用**: 既存 `hooks/use-mutation-with-alert.ts` を活用。`WalkEventActions` / `WalkQuickActions` の直 `.catch()` を置換。`console.warn`/`error` のタグ付きログは `lib/monitoring/logger.ts` に薄く集約（Sentry は既に `lib/monitoring/` で連携）。

### S3. 認証エラーを型化

**採用**: `lib/auth/errors.ts` に `AuthError` discriminated union（`'invalid-credentials' | 'user-exists' | 'code-mismatch' | 'network' | 'unknown'`）。`lib/auth/api.ts` でマッピング、フォームは `switch(err.kind)` で i18n キー。

### S4. WalkEventActions の分解

**採用** (段階分割):
1. `components/walk/EventPill.tsx`（pee/poo/photo 1 ボタン分 UI）
2. `hooks/use-walk-event-recorder.ts`（mutation + error map）
3. `hooks/use-camera-event-trigger.ts`（AppState + Live Activity）
4. 残った `WalkEventActions.tsx` は UI orchestration のみ（目標 120 行以下）

### S5. タイマー hook 共通化

**採用**: `hooks/use-walk-elapsed.ts` を新設。入力 `{ startedAt, isPaused, totalPausedMs }`、出力 `elapsedSec`。`WalkControls` / `WalkMinimizedControls` で共有。

### S6. walk-session グローバル変数除去

**採用**: `activeTrackingCleanup` / `activeTrackingGeneration` を `walk-store.ts` のインスタンス状態へ。`lib/walk/tracking-manager.ts` を新設し GPS + バッチフラッシュを分離。hook は state/effect 配線のみ。

### S7. 設定ストア wrapper 統一

**採用**: `lib/storage/async-storage.ts`（薄い wrapper、typed key + try/catch）を新設し `settings-store.ts` を置換。

### S8. app-example/ 削除

**採用**: 削除して `tsconfig.json` / `app.config.ts` / `.gitignore` 参照を除去。

### S9. ViewModel 抽出 + テスト

**採用**: 画面ごとに `hooks/use-*-view-model.ts` を抽出。画面は props 受け取り + render のみ。ViewModel に Jest 単体テスト。E2E（Detox）は将来別作業。

### S10. テーマトークン統合

**採用**: `theme/tokens.ts` に `radius.xl = 22`, `radius.pill = 100`, `colors.shadow.primary = '#0a84ff'` を追加。ハードコード値を参照に置換。

---

## Phase 3 Implementation Plan — フェーズ分割

優先度は `(impact × ease) / risk` 降順。**各フェーズは独立した新セッションで実装**する前提。

### Phase A: 共通フォーマッタ集約（優先度: 最高 / 規模 S）

- **対象課題**: DRY 7 件
- **変更ファイル**:
  - `lib/walk/format.ts` — `formatDuration`, `formatShortDate`, `formatDateTime`, `formatDistance` に precision 引数
  - 置換: `components/dogs/DogStatsCard.tsx`, `EncounterCard.tsx`, `app/walks/[id].tsx`, `app/dogs/[id]/friends/[friendDogId].tsx`, `components/walk/WalkHistoryItem.tsx`, `components/dogs/FriendCard.tsx`, `components/walk/WalkControls.tsx`
- **完了条件**:
  - `rg "toLocaleDateString|toLocaleString\(" apps/mobile/{app,components,hooks}` がテスト以外で 0 件
  - `rg "^function format(Duration|Distance|Pace)" apps/mobile/{app,components}` が 0 件
  - `npm test -- lib/walk/format` 緑
- **依存**: なし
- **推定**: S（60分）

### Phase B: 認証エラー型化（優先度: 高 / 規模 S）

- **対象課題**: LoginForm/RegisterForm/ConfirmForm の文字列マッチ
- **変更ファイル**:
  - 新規 `lib/auth/errors.ts`
  - `lib/auth/api.ts`
  - `components/auth/{LoginForm,RegisterForm,ConfirmForm}.tsx`
- **完了条件**: `rg "message.includes\(" apps/mobile/components/auth` 0 件、各 AuthError kind に新規テスト 1 本
- **依存**: なし
- **推定**: S（60分）

### Phase C: app-example/ 削除（優先度: 高 / 規模 XS）

- **変更**: `apps/mobile/app-example/` 削除、`tsconfig.json` / `app.config.ts` / `.gitignore` 参照を外す
- **完了条件**: `rg "app-example" apps/mobile` 0 件、typecheck 緑
- **推定**: XS（15分）

### Phase D: walk event エラーハンドリング統一（優先度: 高 / 規模 S）

- **対象課題**: `WalkEventActions` / `WalkQuickActions` の `.catch(console.error)` 重複
- **変更**: `useMutationWithAlert` か新規 `useWalkEventRecorder` を使用
- **完了条件**: `rg "walk event record failed" apps/mobile` 0 件、オフライン状態で記録エラーダイアログ表示（iOS Simulator）
- **依存**: Phase A
- **推定**: S（60分）

### Phase E: タイマー hook 共通化（優先度: 中 / 規模 S）

- **対象課題**: WalkControls / WalkMinimizedControls タイマー重複
- **変更**: `hooks/use-walk-elapsed.ts` 新設、2 コンポーネントで共用
- **完了条件**: hook に fake timer 単体テスト、useEffect タイマー処理が両コンポーネントから消える
- **依存**: Phase A
- **推定**: S（60分）

### Phase F: WalkEventActions.tsx 分解（優先度: 中 / 規模 M）

- **対象課題**: SRP 340行 6 責務
- **変更**: `EventPill.tsx`, `use-walk-event-recorder.ts`, `use-camera-event-trigger.ts` 新設、本体を 120 行以下に
- **完了条件**: 各 hook に最低 3 ケース単体テスト、iOS Simulator で single/multi dog 両方で動作確認
- **依存**: Phase D 必須
- **推定**: M（2–3時間）

### Phase G: walk-session グローバル除去（優先度: 中 / 規模 M）

- **対象課題**: `use-walk-session.ts` のモジュールスコープ変数
- **変更**: `lib/walk/tracking-manager.ts` 新設、`walk-store.ts` に tracking generation 移動
- **完了条件**: `let activeTrackingCleanup` が消える、マルチセッション重複起動を防ぐ新規テスト、iOS Simulator で start→中断→再start
- **依存**: Phase A, E
- **推定**: M（2–3時間）

### Phase H: WalkControls.tsx 分解（優先度: 中 / 規模 M）

- **対象課題**: SRP 300行
- **変更**: フォーマッタは lib へ、タイマーは Phase E の hook、`<Metric />` を `components/ui/Metric.tsx` に抽出
- **完了条件**: `WalkControls.tsx` が 150 行以下
- **依存**: Phase A, E
- **推定**: M（2時間）

### Phase I: stores の責務分離（優先度: 低 / 規模 M）

- **対象課題**: `auth-store` 初期化 orchestration、`settings-store` AsyncStorage 直呼び
- **変更**:
  - `lib/auth/bootstrap.ts` に initialize 処理、store は setter のみ
  - `lib/storage/async-storage.ts` wrapper で `settings-store` 置換
- **完了条件**: store テストが半分以下に縮小、bootstrap の単体テスト
- **依存**: Phase B
- **推定**: M（3時間）

### Phase J: app/ ViewModel 抽出とテスト補強（優先度: 低 / 規模 L）

- **対象課題**: app/ 画面テスト 0 件
- **変更**: 主要 5 画面（`(tabs)/walk`, `walks/[id]`, `(tabs)/dogs`, `dogs/[id]/index`, `(tabs)/me`）の ViewModel を `hooks/use-*-view-model.ts` に抽出、画面は render と props のみに
- **完了条件**: 5 画面分の ViewModel 単体テストが通る、`components/dogs/` 未カバーコンポーネントにもテスト追加
- **依存**: Phase F, H, I（画面が依存する hook/store 整備後）
- **推定**: L（5時間以上、複数セッションに分割）

### Phase K: テーマトークン統合（優先度: 低 / 規模 S）

- **対象課題**: borderRadius/color ハードコード
- **変更**: `theme/tokens.ts` に `radius.xl`, `radius.pill`, `colors.shadow.primary` 追加、参照置換
- **完了条件**: `rg "borderRadius:\s*(22|100)" apps/mobile` 0 件、`rg "'#0a84ff'|'#fff'" apps/mobile/components` が token 参照に置換
- **推定**: S（45分）

---

## 重要な参照先（既存資産）

- `lib/walk/format.ts` — 共通フォーマッタ（Phase A で拡張）
- `hooks/use-mutation-with-alert.ts` — 既存エラーハンドラ（Phase D で流用）
- `lib/auth/secure-storage.ts` — SecureStore wrapper（Phase I で参考）
- `theme/tokens.ts` — テーマ定義（Phase K で拡張）
- `lib/monitoring/` — Sentry 連携（Phase D で流用）

---

## Verification（全体の受け入れ条件）

各フェーズ完了時:

1. **Build**: `docker compose run --rm mobile npm run typecheck` 緑
2. **Test**: `docker compose run --rm mobile npm test` 緑、既存カバレッジ維持
3. **Lint**: `docker compose run --rm mobile npm run lint` 警告ゼロ増
4. **iOS Simulator 手動確認**:
   - 散歩開始 → GPS・BLE 起動 → pee/poo/photo 記録 → 終了 → サマリ
   - 単一犬・複数犬の両ケース
   - バックグラウンド復帰時のカメラトリガー
5. **Progress ログ**: `tasks/refactor/mobile-cleanup/progress.md` を各フェーズ完了時に更新（plan mode 解除後に作成可能）

---

## 実行時ルール

- **git worktree 使わない** — Docker Compose マウント不整合を避ける（CLAUDE.md 準拠）
- **エラー隠蔽禁止** — try/catch 追加を「修正」扱いしない
- **Phase 4 実行は新セッションで** — 本計画を Read で読み込ませて `executing-plans` or `tdd-workflow` で
- **フェーズ間スコープ厳守** — ついでの変更は別フェーズへ
- **Docker 経由で実行** — `npm` は必ず `docker compose run --rm mobile npm …`（CLAUDE.md 準拠）
