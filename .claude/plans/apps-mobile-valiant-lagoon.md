# Refactor Plan: apps/mobile

## Context

`apps/mobile` は機能追加を重ねた結果、画面・フック・ストア・lib にまたがって重複・責務肥大・型安全性の低下が蓄積している。ビルドは通るが、以下の痛みが顕在化：

- 同じ `const isAuthenticated = useAuthStore((s) => s.isAuthenticated)` が 6+ フック、同じ invalidate 2本セットが 8+ 箇所に散在
- `app/(tabs)/walk.tsx` / `app/invite/[token].tsx` / `app/walks/[id].tsx` / `app/dogs/[id]/index.tsx` が 200行超で GPS・BLE・ストレージ・ナビゲーション・UI を1ファイルで抱える
- `components/walk/WalkEventActions.tsx` が tight coupling で、テストが本体 185行に対し 431行
- `hooks/use-encounter-mutations.ts` の戻り型 (`RecordEncounterResponse` / `UpdateEncounterDurationResponse`) が実装と不一致
- `lib/ble/scanner.ts` に `any` が6箇所
- Hero title スタイル (`fontSize: 40, fontWeight: 900, letterSpacing: -0.8, lineHeight: 44`) が4画面で独立定義

リファクタの目的：**機能変更ゼロ**で重複と責務逸脱を解消し、テスト容易性と6ヶ月後の可読性を確保する。実装は新セッションで1フェーズずつ走らせる。

## 成果物置き場

`tasks/refactor/mobile/` に集約：

- `01-scan.md` — Phase 1 Scan (本計画の Findings セクション)
- `02-solutions.md` — Phase 2 候補解 (採用案まとめ)
- `03-plan.md` — Phase 3 実装フェーズ一覧 (下の Implementation Phases)
- `progress.md` — Phase 4 実行トラッカー

承認後に上記ファイルを作成し、実装セッションを起動する。

## Findings サマリ (Phase 1)

**対象**: `apps/mobile/{app,components,hooks,stores,lib,modules,theme,types}` (node_modules/ios/android/app-example除外)

### Top-level 重複 (DRY)

| 場所 | 症状 |
|---|---|
| `hooks/use-{me,walks,dog,dog-encounters,dog-friends,friendship}.ts` | `const isAuthenticated = useAuthStore((s) => s.isAuthenticated)` が6+フックで同一 |
| `hooks/use-{dog,dog-member,accept-invitation}-mutations.ts` + `use-walk-mutations.ts` | `invalidateQueries(meKeys.all)` + `invalidateQueries(dogKeys.all)` の2本セットが8+箇所 |
| `app/(tabs)/{dogs,settings}.tsx` + `app/dogs/[id]/{friends/index,encounters}.tsx` + `app/walks/[id].tsx` | hero title style (40/900/-0.8/44) が4+画面で独立定義 |
| `app/dogs/{new,[id]/edit,[id]/members,[id]/index}.tsx` | `try/catch + Alert.alert + errorTranslation` が3+箇所 |
| `components/walk/{WalkMap,WalkEventTimeline}.tsx` | `EVENT_EMOJIS` マップが2ファイルで重複 |
| `components/{dogs/DogListItem,dogs/EncounterCard,dogs/FriendCard,dogs/DogStatsCard,walks/WalkHistoryItem}` | `theme.border + '33'` のカードボーダー+opacityパターン5箇所 |
| `components/settings/{Profile,Appearance,EncounterDetection}Section.tsx` | `styles.card + styles.sectionTitle` 構造が3セクションで重複 |

### 責務肥大 (SRP)

| 場所 | 症状 | 行数 |
|---|---|---|
| `app/(tabs)/walk.tsx` | GPS追跡 + BLEスキャン/広告 + encounter検出 + バッチ送信 + パーミッション + UI | 201 |
| `app/invite/[token].tsx` | deeplink処理 + state machine + platform別SecureStore + 認証分岐 + errorマップ + 4状態UI | 230 |
| `app/walks/[id].tsx` | データ変換 + Map描画 + タイムライン描画 + walkerセクション描画 | 212 |
| `app/dogs/[id]/index.tsx` | 認可ロジック + delete + 条件付きUI + member/friends/statsレンダリング | 211 |
| `components/walk/WalkEventActions.tsx` | pee/pooボタン + 写真upload choreography (presign→PUT→record) + 深リンク自動起動 | 185 |
| `components/auth/ConfirmForm.tsx` | OTPフォーカス管理 + form submission | 169 |
| `stores/auth-store.ts:initialize()` | token取得 + auth verify + 401/Network分岐 + state更新 | L25-56 |

### 型安全性

- `hooks/use-encounter-mutations.ts:15-45` — 戻り型が実装と不一致 (`RecordEncounterResponse` 実際は `Encounter[]`、`UpdateEncounterDurationResponse` 実際は `boolean`)
- `lib/ble/scanner.ts:22-77` — `any` が6箇所 (BleManager lazy-load、callback params)

### Testability

- `hooks/` 18個中12個テストなし
- `components/ui/{Button,Card,TextInput,SegmentedControl,ConfirmDialog,ErrorScreen,LoadingScreen,EmptyState,ThemedView,Divider}` 全てテストなし
- `components/walk/WalkEventActions.test.tsx` 431行 (本体の2.3倍) ← tight coupling のシグナル

### YAGNI

- `components/walk/WalkMap.tsx:16` — `followUser` prop 常に true、falseパスなし
- `components/walk/WalkControls.tsx:54-62` — pauseボタン disabled だけで実体なし、誤解招く
- `components/ui/Divider.tsx` — 本体1行の wrapper、インライン化可能
- `components/dogs/DogForm.tsx:24` — `gender` state 検証なく描画のみ
- `lib/graphql/keys.ts` — `dogKeys.members()` 定義あるが参照なし

### 副作用の散在

- `app/invite/[token].tsx:16-39` — Platform分岐 `localStorage` vs `SecureStore` が画面ファイル内
- `lib/graphql/client.ts:29-37` — `authenticatedRequest()` 内で動的import+`useAuthStore.getState().refreshAuth()` 直呼び (隠れ依存)
- `lib/auth/secure-storage.ts:53-67` — `migrateLegacyTokensIfNeeded()` が毎回の `getToken()` で実行

### 可読性 / マジックナンバー

- `app/(tabs)/walk.tsx:28` — `MAX_POINTS_PER_BATCH = 200` 根拠コメントなし
- `app/walks/[id].tsx:46-48` — fallback 座標 Tokyo (35.6812, 139.7671) ハードコード
- `components/walk/WalkMap.tsx:71` — `'rgba(239,68,68,0.9)'` ハードコード (theme.error 未使用)
- `lib/graphql/{queries,mutations}.ts` — ドメイン混在で 132行/206行

---

## Implementation Phases (Phase 3)

優先度は `(impact × ease) / risk` で並べた。前のフェーズほど低リスク・高インパクト。各フェーズは1セッション完結。

### Phase 1: 共有フック/定数抽出 (優先度: 最高 / S)

**対象課題**: `isAuthenticated` 重複6+、`EVENT_EMOJIS` 重複2、hero title style 重複4、invalidate ペア重複8+

**変更**:
- `hooks/use-is-authenticated.ts` 新規 — `useAuthStore((s) => s.isAuthenticated)` を1箇所に
- `hooks/use-invalidate-user-queries.ts` 新規 — `meKeys.all + dogKeys.all` invalidate helper
- `lib/walk/event-emojis.ts` 新規 — 2箇所の `EVENT_EMOJIS` 統合
- `theme/tokens.ts` に `typography.hero` 追加、4画面の hero style を置換

**完了条件**:
- 全既存テスト緑 (`docker compose run --rm mobile npm test`)
- `rg "useAuthStore\(\(s\) => s\.isAuthenticated\)" apps/mobile/hooks` が 1件以下
- `rg "invalidateQueries\(\{ queryKey: meKeys\.all" apps/mobile/hooks` が 1箇所(helper内)のみ
- `rg "EVENT_EMOJIS" apps/mobile/components` が `event-emojis.ts` のimportのみ
- `rg "fontSize: 40," apps/mobile/app` がhero token使用のみ

**依存**: なし
**推定規模**: S (60分以内)

### Phase 2: YAGNI 除去 + 型不一致修正 (優先度: 高 / S)

**対象課題**: `WalkMap.followUser`、`WalkControls` pauseボタン、`Divider` wrapper、`DogForm.gender` 未検証、`dogKeys.members()` 未使用、`use-encounter-mutations.ts` 戻り型

**変更**:
- `components/walk/WalkMap.tsx` — `followUser` prop 削除、`showsUserLocation` ハードコード
- `components/walk/WalkControls.tsx` — pauseボタン削除（実装予定なし確認後）
- `components/ui/Divider.tsx` — 利用箇所をインライン `<View style={styles.divider}/>` に置換して削除
- `components/dogs/DogForm.tsx` — `gender` 検証追加 or フィールド削除 (interview で確認)
- `hooks/use-encounter-mutations.ts:15-45` — 戻り型を `Encounter[]` / `boolean` に修正、呼び出し側も更新
- `lib/graphql/keys.ts` — `dogKeys.members()` 削除

**完了条件**:
- `docker compose run --rm mobile npx tsc --noEmit` エラーなし
- 全既存テスト緑
- grepで削除対象が消えている

**依存**: なし (Phase 1 と並行可能だがレビュー簡素化のため順次)
**推定規模**: S (60分以内)

### Phase 3: エラーハンドリング共通化 (優先度: 高 / M)

**対象課題**: `try/catch + Alert.alert + i18n` 3+画面重複、`dogs/[id]/members.tsx:45-75` 3ハンドラ同型

**変更**:
- `hooks/use-mutation-with-alert.ts` 新規 — mutation実行 + エラーを i18n key + Alert.alert に変換する共通フック
- `app/dogs/{new,[id]/edit,[id]/members,[id]/index}.tsx` を置換
- `components/walk/WalkEventActions.tsx` のエラー phase ロジックも検証 (別フェーズで対応するなら保留)

**完了条件**:
- 全既存テスト緑 + 新規 hook テスト追加
- `rg "Alert\.alert" apps/mobile/app` が削減 (直接呼び出しは確認済み例外のみ)

**依存**: Phase 1, 2
**推定規模**: M (2時間以内)

### Phase 4: カード系コンポーネント共通化 (優先度: 中 / M)

**対象課題**: `theme.border + '33'` カードパターン5箇所、settings section 3箇所

**変更**:
- `components/ui/OutlinedCard.tsx` 新規 — border + opacity + radius + padding を prop 化
- `components/settings/SettingsSection.tsx` 新規 — card + title + children 構造
- `DogListItem`, `EncounterCard`, `FriendCard`, `DogStatsCard`, `WalkHistoryItem` を `OutlinedCard` 化
- `ProfileSection`, `AppearanceSection`, `EncounterDetectionSection` を `SettingsSection` 化

**完了条件**:
- 全既存テスト緑 + `OutlinedCard` / `SettingsSection` の unit test
- iOS Simulator で各画面の視覚差分なしを確認 (ios-sim-test でスクリーンショット比較)

**依存**: Phase 1
**推定規模**: M (2-3時間)

### Phase 5: カスタムフック抽出 (優先度: 中 / M)

**対象課題**: `WalkEventActions.tsx` 185行+テスト431行、`ConfirmForm.tsx` OTP logic

**変更**:
- `hooks/use-photo-upload.ts` 新規 — presign → PUT → record の3段を1フック化 (phase error付き)
- `hooks/use-otp-input.ts` 新規 — digit state + focus/backspace imperative 管理
- `components/walk/WalkEventActions.tsx` は `usePhotoUpload()` 呼び出しのみに
- `components/auth/ConfirmForm.tsx` は `useOtpInput()` 呼び出しのみに

**完了条件**:
- `WalkEventActions.test.tsx` が 200行以下に削減
- フック単体テスト新規追加 (use-photo-upload / use-otp-input)
- 全既存テスト緑

**依存**: Phase 3 (mutation-with-alert を使う可能性)
**推定規模**: M (3時間)

### Phase 6: 画面分割 — invite/[token] (優先度: 中 / M)

**対象課題**: `app/invite/[token].tsx` 230行、Platform別SecureStore内包

**変更**:
- `lib/auth/pending-invite-token.ts` 新規 — Platform抽象化 (`save/get/delete`)
- `hooks/use-accept-invite-flow.ts` 新規 — state machine + 認証分岐を切り出し
- `lib/errors/invite-error-map.ts` 新規 — `mapInviteErrorMessage` を i18n keyベースに
- `app/invite/[token].tsx` はUIレンダリングのみ

**完了条件**:
- 画面本体 100行以下
- pending-invite-token / use-accept-invite-flow に unit test
- 深リンク手動テスト (auth済/未認証/期限切れ/使用済み の4パス)

**依存**: Phase 1, 3
**推定規模**: M (3-4時間)

### Phase 7: 画面分割 — (tabs)/walk (優先度: 中 / L / risk:高)

**対象課題**: `app/(tabs)/walk.tsx` 201行、GPS + BLE + encounter + UI 全部入り

**変更**:
- `hooks/use-walk-session.ts` 新規 — startWalk/finishWalk + 点バッチ送信 (MAX_POINTS_PER_BATCH 定数化理由コメント付き)
- `hooks/use-ble-session.ts` 新規 — BLE scan/advertise のライフサイクル
- `hooks/use-encounter-session.ts` 新規 — encounter tracker の record/update
- `hooks/use-walk-permissions.ts` 新規 — 位置情報+BLE+通知 パーミッションオーケストレーション
- `app/(tabs)/walk.tsx` は上記の合成のみ

**完了条件**:
- 画面本体 100行以下
- 各フックに unit test
- iOS Simulator で散歩開始→停止のスモーク試験 (GPS取得、BLE広告、encounter記録が動く)
- 既存 `__tests__/app/tabs/walk.test.tsx` が緑 (あれば)

**依存**: Phase 1, 3
**推定規模**: L (半日〜1日)

### Phase 8: 画面分割 — walks/[id] + dogs/[id] (優先度: 低 / M)

**対象課題**: `app/walks/[id].tsx` 212行、`app/dogs/[id]/index.tsx` 211行

**変更**:
- `hooks/use-walk-detail-view-model.ts` 新規 — duration/distance/date/midpoint 計算
- `app/walks/[id].tsx` はMap + Timeline + WalkerSection の合成のみ
- `hooks/use-dog-detail-authorization.ts` 新規 — isOwner/isCurrentMember 判定
- `app/dogs/[id]/index.tsx` は presentational のみ
- walks側の Tokyo fallback 座標は `lib/walk/constants.ts` に理由コメント付きで切り出し

**完了条件**:
- 各画面 150行以下
- view-model hook の unit test

**依存**: Phase 3
**推定規模**: M (3-4時間)

### Phase 9: GraphQL 整理 + auth client改善 (優先度: 低 / M)

**対象課題**: `lib/graphql/{queries,mutations}.ts` ドメイン混在、`lib/graphql/client.ts` の refresh middleware 化、`lib/auth/secure-storage.ts` 毎回 migration

**変更**:
- `lib/graphql/{dog,walk,me,friendship,encounter}.{queries,mutations}.ts` にドメイン分割、`index.ts` から re-export
- `lib/graphql/client.ts` — refresh ロジックを `middleware/refresh-on-401.ts` に切り出し (interceptor pattern)
- `lib/auth/secure-storage.ts` — migration を app 起動時1回 (auth-store.initialize) に移動

**完了条件**:
- 全既存テスト緑
- 起動時マイグレーション確認 (auth-store test)

**依存**: Phase 3
**推定規模**: M (3時間)

### Phase 10: BLE scanner 型安全化 + テスト追加 (優先度: 低 / M / risk:中)

**対象課題**: `lib/ble/scanner.ts` `any` 6箇所、UI primitive テスト0

**変更**:
- `lib/ble/scanner.ts` — `react-native-ble-plx` の型を直接import、`any` を排除
- `components/ui/{Button,Card,TextInput,SegmentedControl,ConfirmDialog}.test.tsx` 新規

**完了条件**:
- `rg "any" apps/mobile/lib/ble/scanner.ts` が 0 (または合理的な例外のみ)
- UI primitive テストで各 variant/state カバー
- iOS Simulator で BLE スキャン動作確認

**依存**: なし
**推定規模**: M (3-4時間)

---

## 検証戦略

各フェーズ共通：
1. `docker compose run --rm mobile npm test` 緑
2. `docker compose run --rm mobile npx tsc --noEmit` エラーなし
3. `docker compose run --rm mobile npm run lint` 警告なし
4. 画面変更あるフェーズは iOS Simulator でスモーク (`ios-simulator-skill` の scripts 経由)

**機能変更の禁止**: 各フェーズで `git diff --stat` を確認し、計画外のファイル変更がないかチェック。

## セッション起動テンプレ (Phase 4 Execute時)

```
tasks/refactor/mobile/03-plan.md の Phase <N> を実行して。
TDD で進める (superpowers:test-driven-development)。
完了したら progress.md の Phase <N> を完了に更新して。
```

## Critical Files

- `apps/mobile/hooks/` — Phase 1, 3, 5, 7, 8 で変更
- `apps/mobile/app/(tabs)/walk.tsx` — Phase 7
- `apps/mobile/app/invite/[token].tsx` — Phase 6
- `apps/mobile/app/walks/[id].tsx` — Phase 8
- `apps/mobile/app/dogs/[id]/index.tsx` — Phase 8
- `apps/mobile/components/walk/WalkEventActions.tsx` — Phase 5
- `apps/mobile/components/auth/ConfirmForm.tsx` — Phase 5
- `apps/mobile/lib/graphql/` — Phase 1, 9
- `apps/mobile/lib/ble/scanner.ts` — Phase 10
- `apps/mobile/lib/auth/secure-storage.ts` — Phase 9
- `apps/mobile/theme/tokens.ts` — Phase 1

## 既存の再利用可能ユーティリティ

- `theme/tokens.ts` (colors/spacing/radius/typography) — Phase 1 で hero 追加
- `hooks/use-themed-styles.ts` — 既にある memoized StyleSheet ヘルパー
- `hooks/use-colors.ts` — theme アクセス
- `lib/walk/{distance,format,gps-tracker}.ts` — 既にドメイン分離済み、変更不要
- `lib/graphql/keys.ts` — query key definition (Phase 2 で未使用 key 削除のみ)
