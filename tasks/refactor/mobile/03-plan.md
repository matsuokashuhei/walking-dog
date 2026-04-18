# Plan: apps/mobile

優先度 = `(impact × ease) / risk`。先頭ほど低リスク・高インパクト。**各フェーズは新セッションで実行**。

## 共通検証 (全フェーズ適用)

```
docker compose run --rm mobile npm test
docker compose run --rm mobile npx tsc --noEmit
docker compose run --rm mobile npm run lint
```

変更行あるフェーズは iOS Simulator で影響画面をスモーク (`ios-simulator-skill` scripts 経由)。

---

## Phase 1: 共有フック/定数抽出 (優先度: 最高)

- **対象課題**: DRY (isAuthenticated 6+重複, invalidate pair 8+重複, EVENT_EMOJIS 2+重複, hero style 4+重複)
- **変更**:
  - `apps/mobile/hooks/use-is-authenticated.ts` 新規 — `useAuthStore((s) => s.isAuthenticated)` wrapper
  - `apps/mobile/hooks/use-invalidate-user-queries.ts` 新規 — `meKeys.all + dogKeys.all` invalidator
  - `apps/mobile/lib/walk/event-emojis.ts` 新規 — emoji マップ統合
  - `apps/mobile/theme/tokens.ts` に `typography.hero` 追加
  - 対象ファイル (hooks 6件, mutation hooks 5件, screens 4件, walk components 2件) を置換
- **完了条件**:
  - 全既存テスト緑
  - `rg "useAuthStore\(\(s\) => s\.isAuthenticated\)" apps/mobile/hooks` ≤ 1
  - `rg "invalidateQueries\(\{ queryKey: meKeys\.all" apps/mobile/hooks` が helper 内のみ
  - `rg "EVENT_EMOJIS" apps/mobile/{components,app}` が `event-emojis.ts` import のみ
  - `rg "fontSize: 40," apps/mobile/app` が hero token 参照のみ
- **依存**: なし
- **推定規模**: S (60分)

## Phase 2: YAGNI 除去 + 型不一致修正 (優先度: 高)

- **対象課題**: WalkMap.followUser, WalkControls pause, Divider, DogForm.gender, dogKeys.members(), use-encounter-mutations 戻り型
- **変更**:
  - `components/walk/WalkMap.tsx` — `followUser` prop削除
  - `components/walk/WalkControls.tsx` — pauseボタン削除
  - `components/ui/Divider.tsx` — 利用箇所をインライン化後ファイル削除
  - `components/dogs/DogForm.tsx` — `gender` 検証追加 / 削除は interview で確認 (デフォ: 検証追加)
  - `hooks/use-encounter-mutations.ts` — 戻り型を `Encounter[]` / `boolean` に修正、呼び出し側調整
  - `lib/graphql/keys.ts` — `dogKeys.members()` 削除
- **完了条件**:
  - `npx tsc --noEmit` エラーなし
  - 全既存テスト緑
  - grep で削除対象が消えている
- **依存**: なし (Phase 1 と並行可)
- **推定規模**: S (60分)

## Phase 3: エラーハンドリング共通化 (優先度: 高)

- **対象課題**: try/catch+Alert 画面3+ 重複, members.tsx 3ハンドラ同型
- **変更**:
  - `hooks/use-mutation-with-alert.ts` 新規 — mutation 実行 + i18n key + Alert.alert
  - `app/dogs/{new,[id]/edit,[id]/members,[id]/index}.tsx` を置換
- **完了条件**:
  - 全既存テスト緑 + 新規 hook テスト
  - `rg "Alert\.alert" apps/mobile/app` 削減 (確認済み例外のみ残す)
- **依存**: Phase 1
- **推定規模**: M (2時間)

## Phase 4: カード系コンポーネント共通化 (優先度: 中)

- **対象課題**: カードボーダー5箇所, settings section 3箇所
- **変更**:
  - `components/ui/OutlinedCard.tsx` 新規
  - `components/settings/SettingsSection.tsx` 新規
  - `theme/tokens.ts` に `colors.cardBorder` (alpha込み) 追加
  - 対象コンポーネント5件をリファクタ
- **完了条件**:
  - 全既存テスト緑 + 新 unit test
  - iOS Simulator で各画面視覚差分なし
- **依存**: Phase 1
- **推定規模**: M (2-3時間)

## Phase 5: カスタムフック抽出 — WalkEventActions / ConfirmForm (優先度: 中)

- **対象課題**: WalkEventActions 185行+テスト431行, ConfirmForm OTP
- **変更**:
  - `hooks/use-photo-upload.ts` 新規 — presign→PUT→record (phase error付き)
  - `hooks/use-otp-input.ts` 新規 — digit state + focus/backspace
  - `components/walk/WalkEventActions.tsx` を簡素化
  - `components/auth/ConfirmForm.tsx` を簡素化
- **完了条件**:
  - `WalkEventActions.test.tsx` ≤ 200行
  - フック単体テスト新規追加
  - 全既存テスト緑
- **依存**: Phase 3
- **推定規模**: M (3時間)

## Phase 6: 画面分割 — invite/[token] (優先度: 中)

- **対象課題**: invite/[token].tsx 230行, Platform別SecureStore内包
- **変更**:
  - `lib/auth/pending-invite-token.ts` 新規 (Platform抽象化)
  - `hooks/use-accept-invite-flow.ts` 新規 (state machine + 認証分岐)
  - `lib/errors/invite-error-map.ts` 新規 (i18n key ベース)
  - `app/invite/[token].tsx` を描画のみに
- **完了条件**:
  - 画面本体 ≤ 100行
  - pending-invite-token / use-accept-invite-flow に unit test
  - 深リンク手動テスト 4パス (auth済/未認証/期限切れ/使用済み)
- **依存**: Phase 1, 3
- **推定規模**: M (3-4時間)

## Phase 7: 画面分割 — (tabs)/walk (優先度: 中 / risk:高)

- **対象課題**: (tabs)/walk.tsx 201行
- **変更**:
  - `hooks/use-walk-session.ts` 新規 — start/finish + 点バッチ送信 (MAX_POINTS_PER_BATCH 理由コメント付き)
  - `hooks/use-ble-session.ts` 新規 — BLE scan/advertise
  - `hooks/use-encounter-session.ts` 新規 — encounter record/update
  - `hooks/use-walk-permissions.ts` 新規 — 位置+BLE+通知 permission orchestration
  - `app/(tabs)/walk.tsx` を合成のみに
- **完了条件**:
  - 画面本体 ≤ 100行
  - 各フック unit test
  - iOS Simulator で散歩開始→停止スモーク (GPS/BLE/encounter動作)
- **依存**: Phase 1, 3
- **推定規模**: L (半日〜1日)

## Phase 8: 画面分割 — walks/[id] + dogs/[id] (優先度: 低)

- **対象課題**: walks/[id].tsx 212行, dogs/[id]/index.tsx 211行
- **変更**:
  - `hooks/use-walk-detail-view-model.ts` 新規 (duration/distance/date/midpoint)
  - `lib/walk/constants.ts` 新規 — Tokyo fallback座標を理由コメント付き export
  - `hooks/use-dog-detail-authorization.ts` 新規
  - 画面2件を presentational に
- **完了条件**:
  - 各画面 ≤ 150行
  - view-model hook の unit test
- **依存**: Phase 3
- **推定規模**: M (3-4時間)

## Phase 9: GraphQL 整理 + auth client改善 (優先度: 低)

- **対象課題**: queries/mutations.ts ドメイン混在, client.ts refresh interleave, secure-storage 毎回 migration
- **変更**:
  - `lib/graphql/{dog,walk,me,friendship,encounter,auth}.{queries,mutations}.ts` にドメイン分割
  - `lib/graphql/middleware/refresh-on-401.ts` 新規 — interceptor
  - `lib/graphql/client.ts` — request 実行のみに
  - `lib/auth/secure-storage.ts` — migration を `auth-store.initialize()` 先頭 1回に移動
- **完了条件**:
  - 全既存テスト緑
  - auth-store.initialize で migration 実行の unit test
- **依存**: Phase 3
- **推定規模**: M (3時間)

## Phase 10: BLE scanner 型安全化 + UI primitive テスト (優先度: 低 / risk:中)

- **対象課題**: lib/ble/scanner.ts any×6, UI primitive テスト0
- **変更**:
  - `lib/ble/scanner.ts` — `react-native-ble-plx` 公式型を使用
  - `components/ui/{Button,Card,TextInput,SegmentedControl,ConfirmDialog}.test.tsx` 新規
- **完了条件**:
  - `rg "any" apps/mobile/lib/ble/scanner.ts` = 0 (合理的例外除く)
  - UI primitive テストで variant / state カバー
  - iOS Simulator で BLE スキャン動作確認
- **依存**: なし
- **推定規模**: M (3-4時間)

---

## セッション起動テンプレ

```
tasks/refactor/mobile/03-plan.md の Phase <N> を実行して。
TDD で進める (superpowers:test-driven-development)。
完了したら tasks/refactor/mobile/progress.md の Phase <N> を完了に更新して。
```
