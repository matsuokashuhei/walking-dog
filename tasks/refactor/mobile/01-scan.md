# Scan: apps/mobile

対象: `apps/mobile/{app,components,hooks,stores,lib,modules,theme,types}` (node_modules / ios / android / app-example / .expo / assets 除外)
日付: 2026-04-17

## 課題一覧

### DRY — 重複

- [DRY] `apps/mobile/hooks/use-me.ts:9` / `use-walks.ts:9,21` / `use-dog.ts` / `use-dog-encounters.ts:9` / `use-dog-friends.ts:9` / `use-friendship.ts:9` — `const isAuthenticated = useAuthStore((s) => s.isAuthenticated)` が6+フックに同一記述
- [DRY] `apps/mobile/hooks/use-dog-mutations.ts:28-30,44-46,58-60` / `use-walk-mutations.ts:40` / `use-dog-member-mutations.ts:38-40,55-57` / `use-accept-invitation.ts:18-19` — `queryClient.invalidateQueries({ queryKey: meKeys.all })` + `queryClient.invalidateQueries({ queryKey: dogKeys.all })` の2本セットが8+箇所で重複
- [DRY] `apps/mobile/app/(tabs)/dogs.tsx:99-105` / `(tabs)/settings.tsx:70-76` / `dogs/[id]/friends/index.tsx:64-69` / `dogs/[id]/encounters.tsx:60-65` / `walks/[id].tsx:81-94` — hero title スタイル (`fontSize: 40, fontWeight: 900, letterSpacing: -0.8, lineHeight: 44`) が4+画面で独立定義
- [DRY] `apps/mobile/app/dogs/new.tsx:15-23` / `dogs/[id]/edit.tsx:31-41,44-54` / `dogs/[id]/members.tsx:46-52,57-65,69-75` / `dogs/[id]/index.tsx:33-38` — `try/catch + Alert.alert + error翻訳` パターンが3+画面・3+ハンドラで重複
- [DRY] `apps/mobile/components/walk/WalkMap.tsx:9-13` と `WalkEventTimeline.tsx:11-15` — `EVENT_EMOJIS` マップが2ファイル重複 (`walks/[id].tsx:13-17` にも類似定義)
- [DRY] `apps/mobile/components/dogs/DogListItem.tsx:24-29` / `EncounterCard.tsx:30-35` / `FriendCard.tsx:24-29` / `DogStatsCard.tsx:29-34` / `components/walks/WalkHistoryItem.tsx:32-37` — `theme.border + '33'` カードボーダーパターン5箇所重複
- [DRY] `apps/mobile/components/settings/ProfileSection.tsx:42-48` / `AppearanceSection.tsx:51-58` / `EncounterDetectionSection.tsx:33-40` — `styles.card + styles.sectionTitle` 構造を3セクションで独立定義
- [DRY] `apps/mobile/app/dogs/[id]/encounters.tsx:23-30` と `dogs/[id]/friends/index.tsx:24-31` — ヘッダー (sectionLabel + heroTitle + padding) が同構造
- [DRY] `apps/mobile/app/(tabs)/dogs.tsx:67-72` / `dogs/[id]/friends/index.tsx:33-36` / `dogs/[id]/encounters.tsx:32-35` — EmptyState呼び出しが類似シグネチャで重複

### KISS — 複雑さ過剰

- [KISS] `apps/mobile/components/auth/ConfirmForm.tsx:26,31-45` — OTP入力が ref array + 手動 focus/backspace管理
- [KISS] `apps/mobile/components/walk/WalkEventActions.tsx:58-109` — 写真アップロードの3段 choreography (presign→PUT→record) + phase error tracking + deep-link自動起動を1コンポーネントに
- [KISS] `apps/mobile/components/walk/DogSelector.tsx:57-99` — FlatList renderItem 内の Pressable + 条件分岐で4段ネスト
- [KISS] `apps/mobile/app/walks/[id].tsx:46-48` — Midpoint fallback に Tokyo 座標 (35.6812, 139.7671) ハードコード、根拠コメントなし
- [KISS] `apps/mobile/app/invite/[token].tsx:41-52` — `mapInviteErrorMessage` が `includes('expired')` など文字列マッチでi18n前の英語前提

### YAGNI — 未使用

- [YAGNI] `apps/mobile/components/walk/WalkMap.tsx:15-18` — `followUser` prop 常に true、false パスなし
- [YAGNI] `apps/mobile/components/walk/WalkControls.tsx:54-62` — pauseボタン disabled 表示のみで実体ロジックなし
- [YAGNI] `apps/mobile/components/ui/Divider.tsx:1-20` — 1行の `<View/>` を返すだけのラッパー
- [YAGNI] `apps/mobile/components/dogs/DogForm.tsx:24` — `gender` state 定義・描画のみで検証・送信未使用
- [YAGNI] `apps/mobile/lib/graphql/keys.ts` — `dogKeys.members()` 定義あるが参照hookなし
- [YAGNI] `apps/mobile/lib/ble/encounter-tracker.ts` — class定義だがhook経由の参照なし（要確認）

### SRP — 責務肥大

- [SRP] `apps/mobile/app/(tabs)/walk.tsx:1-201` — GPS追跡 + BLE scan/advertise + encounter検出 + 点バッチ送信 + permissionオーケストレーション + UI描画を1画面に
- [SRP] `apps/mobile/app/invite/[token].tsx:1-230` — deeplink抽出 + state machine + Platform分岐SecureStore + 認証分岐 + errorマップ + 4状態UIを1画面に
- [SRP] `apps/mobile/app/walks/[id].tsx:1-212` — データ変換 + Map描画 + timelineイベント描画 + walker section描画
- [SRP] `apps/mobile/app/dogs/[id]/index.tsx:1-211` — 認可判定 + delete mutation + 条件付きUI + member/friends/stats描画
- [SRP] `apps/mobile/app/dogs/[id]/members.tsx:45-75` — 3ハンドラ (invite/remove/leave) が同一try/catch+Alertパターンで独立実装
- [SRP] `apps/mobile/components/walk/WalkEventActions.tsx:1-185` — pee/poo mutation + 写真upload choreography + deep-link自動起動 + haptics
- [SRP] `apps/mobile/components/auth/ConfirmForm.tsx:1-169` — OTPフォーカス管理 + フォーム送信
- [SRP] `apps/mobile/stores/auth-store.ts:25-56` — token取得 + auth verify + 401/Network分岐 + state更新をinitialize()1関数で
- [SRP] `apps/mobile/stores/auth-store.ts:70-90` — `refreshAuth()` が retry (exp backoff) + refresh + storage更新を抱合
- [SRP] `apps/mobile/lib/graphql/client.ts:18-42` — `authenticatedRequest()` が request + 401検出 + 動的import + refresh呼び出しを混在
- [SRP] `apps/mobile/components/settings/ProfileSection.tsx:53-95` — edit mode と display mode を1コンポーネントに

### OCP

- [OCP] `apps/mobile/app/walks/[id].tsx:13-17` / `components/walk/WalkMap.tsx:9-13` / `WalkEventTimeline.tsx:11-15` — EVENT_EMOJIS が3箇所にハードコード、追加時に複数修正必要
- [OCP] `apps/mobile/app/(tabs)/walk.tsx:28` — `MAX_POINTS_PER_BATCH = 200` ハードコード、configurable化されていない

### 型安全性

- [TYPE] `apps/mobile/hooks/use-encounter-mutations.ts:15-30` — `useRecordEncounter()` 戻り型 `RecordEncounterResponse` は実装と不一致（実際 `Encounter[]`）
- [TYPE] `apps/mobile/hooks/use-encounter-mutations.ts:34-45` — `useUpdateEncounterDuration()` 戻り型 `UpdateEncounterDurationResponse` は実装と不一致（実際 `boolean`）
- [TYPE] `apps/mobile/lib/ble/scanner.ts:22,23,25,39,74` — `BleManager`, `bleManagerInstance`, callbackパラメータ `(error: any, device: any)` など `any` 型が6箇所
- [TYPE] `apps/mobile/lib/graphql/errors.ts:4` — `isNetworkError()` が `TypeError` で早期 true、誤分類の恐れ

### 副作用の散在

- [CONCERN] `apps/mobile/app/invite/[token].tsx:16-39` — `PENDING_INVITE_KEY` の Platform別 localStorage / SecureStore 実装が画面ファイル内
- [CONCERN] `apps/mobile/lib/graphql/client.ts:29-37` — 動的import で `useAuthStore.getState().refreshAuth()` 呼び出し → 隠れ依存
- [CONCERN] `apps/mobile/lib/auth/secure-storage.ts:53-67` — `migrateLegacyTokensIfNeeded()` が `getToken()` 毎回実行
- [CONCERN] `apps/mobile/lib/providers.tsx:10-24` — Query/Mutation cache で `useAuthStore.getState().clearAuth()` を直呼び
- [CONCERN] `apps/mobile/lib/i18n/index.ts:1-19` — i18n初期化と言語検出を混在
- [CONCERN] `apps/mobile/components/settings/EncounterDetectionSection.tsx:20-30` — mutation をコンポーネント内で直定義
- [CONCERN] `apps/mobile/components/walk/WalkEventActions.tsx:114-118` — deep-link (`cameraRequestedAt`) をコンポーネントのuseEffectで処理

### Testability

- [TEST] `apps/mobile/hooks/` 18ファイル中12ファイルがテストなし (`use-me`, `use-walks`, `use-dog`, `use-dog-encounters`, `use-dog-friends`, `use-friendship`, `use-dog-mutations`, `use-walk-mutations`, `use-profile-mutation`, `use-color-scheme`, `use-colors`, `use-color-scheme.web`)
- [TEST] `apps/mobile/components/ui/{Button,Card,TextInput,SegmentedControl,ConfirmDialog,ErrorScreen,LoadingScreen,EmptyState,ThemedView,Divider}.tsx` 全てテストなし
- [TEST] `apps/mobile/components/walk/WalkEventActions.test.tsx` 431行 vs 本体185行 (2.3倍) → tight coupling シグナル
- [TEST] `apps/mobile/app/` 配下screenで unit test 皆無 (6 screenテストのみ `__tests__/app/`)
- [TEST] `apps/mobile/components/auth/ConfirmForm.tsx` / `components/dogs/PhotoPicker.tsx` / `components/walk/DogSelector.tsx` / `components/settings/ProfileSection.tsx` テストなし

### 可読性 / マジックナンバー

- [READ] `apps/mobile/app/(tabs)/walk.tsx:28` — `MAX_POINTS_PER_BATCH = 200` 根拠不明
- [READ] `apps/mobile/app/walks/[id].tsx:46-48` — Tokyo座標fallback ハードコード、根拠コメントなし
- [READ] `apps/mobile/app/walks/[id].tsx:59-60` — `latitudeDelta/longitudeDelta = 0.01` ズーム根拠不明
- [READ] `apps/mobile/components/walk/WalkMap.tsx:71` — `'rgba(239,68,68,0.9)'` ハードコード、theme.error 未使用
- [READ] `apps/mobile/app/(tabs)/walk.tsx:72-132` — `handleStart` useCallback 依存11件 → 高結合
- [READ] `apps/mobile/lib/graphql/mutations.ts:1-206` / `queries.ts:1-132` — ドメイン混在で長大
- [READ] `apps/mobile/stores/walk-store.ts:15-19` — `cameraRequestedAt` タイムスタンプ戦略コメント冗長

### 実行時重複 (upload helper)

- [CONCERN] `apps/mobile/lib/upload.ts:16` — localstack ホスト置換がハードコード、環境ごと切り替えなし

## 備考

- スタイリング・a11y ・theme token 遵守は良好 (インライン styleなし、magic color少ない)
- `components/ui/` に `StyleSheet.create` + token import 規律守られている
- `lib/walk/{distance,format,gps-tracker}.ts` は既に純粋関数化済み、Phase対象外
