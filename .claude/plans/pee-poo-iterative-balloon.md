# Lock Screen Widget: pee/poo 無反応 + カメラ シャッター無反応 修正計画

## Context

ユーザー報告（逐語）: 「ロック画面に表示されるウィジェットでpeeやpooを押しても、データが記録されませんでした。またカメラを起動してもシャッターボタンが無効でした。」

最新コミット `1b60162 feat(mobile): restore shared keychain (App Group + keychain-access-groups)` で、Live Activity（ロック画面ウィジェット）の pee / poo / camera ボタン機能を正式に有効化した。ところが実機（iPhone）＋さくら VPS の API 構成で以下 2 件の不具合が確認された。

- **Bug A: pee / poo** — ロック画面ウィジェットで pee / poo を押しても、`WalkEvent` が DB に記録されない。ユーザーには失敗理由が一切見えない。
- **Bug B: カメラ シャッター** — ウィジェットの 📷 ボタンを押すと iOS 標準カメラは起動するが、シャッターボタンが反応しない（ライブプレビューは動く、× / フリップは効く、白い丸ボタンだけ押しても何も起きない）。

散歩は継続中（Live Activity 表示中）で、`walkId` は App Group に書き込まれている前提。両者とも最近追加されたウィジェット連携のコードパスに固有の問題で、既存のアプリ内 Pee/Poo/Photo ボタン操作には影響していない。

根本原因は確定していない。Bug A の AppIntent は失敗時も `throw` するだけでユーザーも開発者もエラー理由が分からないため、**まず Bug A は原因特定の仕組みを入れる → 特定 → 直す** の順で進める。Bug B は UIKit の presenter タイミング起因の典型パターンであり、独立して修正できる。

## 方針

### Bug A: pee / poo 無反応 — 失敗原因を可視化してから根本修正する

AppIntent が失敗している理由を現状 **まったくユーザー側でも開発者側でも把握できない**。4 つの失敗モード（`missingContext` / `missingToken` / `network` / `graphQLError`）のうちどれが起きているか分からないので、ブラインドで直す前に診断情報を出す。

#### Step A-1: AppIntent の失敗を Live Activity で可視化する

最小侵襲の設計：`WalkAttributes.ContentState` に `lastEventError: String?` を追加し、失敗時はそれを書き込む。ロック画面側には赤バッジで数秒表示する。

- 対象ファイル
  - `apps/mobile/targets/walk-live-activity/WalkAttributes.swift`
  - `apps/mobile/modules/walk-activity/ios/WalkAttributes.swift` — ウィジェットと **byte-identical** にする規約（ファイル頭コメントで宣言済み）
  - `apps/mobile/targets/walk-live-activity/WalkEventIntents.swift` — catch して `lastEventError` を書き込む
  - `apps/mobile/targets/walk-live-activity/WalkLiveActivity.swift` — `lastEventError` があれば pee/poo ボタン上に小さく `⚠ <reason>` を重ねる
- `WalkEventClient` 側は既に `WalkEventClientError` を enum で持っているので、`rawDescription` を付けて string 化する（`missingContext` / `missingToken` / `unauthorized` / `network(code)` / `graphQL(msg)` / `invalidURL` / `invalidResponse`）。

これで次回ユーザーが pee/poo を押すと、どのフェーズで失敗しているかが即座に見える。

#### Step A-2: 特定した原因に応じて根本修正

先に可能性が高い順に整理しておく。

1. **`missingToken`（最有力）** — 共有キーチェーンから access token が読めない。考えられる原因:
   - `1b60162` 以前にログイン済みで、`migrateLegacyTokens` がまだ走っていない。対応: アプリ側 `lib/auth/auth-store.ts` の起動シーケンスで必ず `migrateLegacyTokens` 完了後に初回 `getToken` が走ることを確認する。走っていれば次起動で解消。走っていなければ auth 初期化を修正。
   - `expo-target.config.js:13` の `'keychain-access-groups': keychainGroups` が実際のビルドで空配列になっている。対応: `generated.entitlements` を読んでビルド成果物に `keychain-access-groups` が含まれるか確認。含まれていなければ `expo-target.config.js` で fallback を持たせる。
   - Apple Developer Portal 側で Widget 拡張の App ID に Keychain Sharing Capability が付いていない（Personal Team 時代の残骸）。対応: `eas build` 時に provisioning profile を再生成するか、Apple Developer Portal で手動確認。

2. **`unauthorized`（次点）** — token は読めているが期限切れ。ウィジェットは refresh token 経由で更新する機能を持たない（`WalkEventClient.swift:68-70` は 401 を投げるだけ）。対応: **最小対応** として `WalkEventClientError.unauthorized` を `lastEventError` に載せて「再ログインしてください」と案内する。**理想対応** としてウィジェット側でも `SharedKeychain.readRefreshToken()` を使って `/auth/refresh` を叩き、新しい access token を shared keychain に書き戻す（`SharedKeychain` に書き込み API を追加）。今回はユーザー要望に応じて最小対応を採用し、理想対応は別タスクにする。

3. **`network`** — さくら VPS が HTTPS であることを確認。`extras.apiUrl`（`app.config.ts:102`）が `http://...` だと ATS でブロックされる。対応: `.env.production` / `.env.development` で `API_URL=https://...` を設定。

4. **`graphQLError`** — 入力バリデーション失敗。サーバー側 `apps/api/src/graphql/mutations/walk_event.rs:125-140` を読むと `walkId` / `eventType` / `occurredAt` のみ必須で、ウィジェットが送る `{walkId, eventType, occurredAt, dogId?}` は schema に合致している。このパスは可能性が低い。

5. **`missingContext`** — 散歩継続中なのでほぼあり得ないが、App Group の bundle prefix 解決（`SharedConstants.swift:10-16`）が失敗するケースでは起きる。診断の第一ラウンドで除外できる。

#### Step A-3: 再発防止

- `WalkEventClient.swift` の URLSession タスクで `HTTPURLResponse` の `statusCode` と response body を OSLog に残す（`Logger(subsystem: "com.walkingdog.liveactivity", category: "Network")`）。Console.app で `subsystem == com.walkingdog.liveactivity` でフィルタすれば iPhone 実機からでも確認できる。
- テスト: `apps/mobile/targets/walk-live-activity/*Tests.swift` は現状存在しない。Widget Extension 単体のユニットテストは環境整備が重いので、`WalkEventClient` の GraphQL ボディ組み立てだけ手動で Curl 比較する（別タスク化）。

### Bug B: カメラ シャッター無反応

スクリーンショットから iOS 標準カメラは起動しておりプレビューも動いているが、シャッターボタンだけタップに反応しない。このパターンは **`UIImagePickerController` を deep link のハンドラ内で present した場合**、UIKit のウィンドウ遷移が完了しきる前にモーダルが押し込まれてタッチハンドリングが壊れる、という既知挙動に合致する。

現在のフロー（`app/(tabs)/walk.tsx:44-48` → `walk-store.cameraRequestedAt` → `components/walk/WalkEventActions.tsx:102-106` → `handlePhoto`）では、deep link 受信→Zustand 更新→effect 発火→`ImagePicker.launchCameraAsync` が **数フレーム以内** に連鎖する。アプリが cold start／backgrounded 状態から起動した直後だとここが詰まりがち。

#### Step B-1: 起動後のアイドルを待ってから launchCameraAsync する

- 対象ファイル: `apps/mobile/components/walk/WalkEventActions.tsx`
- 変更: Live Activity 経由の effect (L102-106) 内で `handlePhoto()` を呼ぶ前に、`InteractionManager.runAfterInteractions` と `AppState` が `'active'` になるのを待つ。両方を満たした後、さらに 150ms 程度の遅延を挟んでから `handlePhoto()`。
- 併せて `handlePhoto` 側（L58-97）は unchanged。アプリ内 📷 ボタンから直接呼ぶ経路は今まで通りに動く。

#### Step B-2: Deep link の cold start 取りこぼしを直す

関連バグ：`app/(tabs)/walk.tsx:44-48` は `phase === 'recording' && walkId` が条件だが、cold start 直後はまだ `phase === 'ready'` かつ `walkId === null`。にもかかわらず `router.setParams({ action: undefined })` で action が消されるため、後で store が hydrate されても effect は再発火しない。

- 変更案: `if (params.action !== 'camera') return;` で early return した後、条件を満たさない場合は `router.setParams` を呼ばずに待機する。条件が満たされた時点で初めて `requestCamera()` と `setParams(undefined)` を呼ぶ。これで hydrate 完了後に取りこぼさず発火する。
- この Phase の修正は Bug B と独立に効くので、まとめて一つの PR で出す。

#### Step B-3: 手動検証

- ロック画面で Live Activity の 📷 をタップ → Face ID → カメラ起動 → シャッター反応を確認。
- 散歩開始前（`phase === 'ready'`）に Live Activity を出すケースは存在しない（startActivity は walk 開始時のみ）ので、cold start の race は「散歩中にアプリを kill → ロック画面 → 📷」で再現。

### 修正対象ファイル一覧

**Bug A**
- `apps/mobile/targets/walk-live-activity/WalkAttributes.swift` — `ContentState.lastEventError: String?` を追加
- `apps/mobile/modules/walk-activity/ios/WalkAttributes.swift` — 同上（byte-identical）
- `apps/mobile/targets/walk-live-activity/WalkEventIntents.swift` — catch → ContentState 更新
- `apps/mobile/targets/walk-live-activity/WalkEventClient.swift` — OSLog の詳細ログ追加
- `apps/mobile/targets/walk-live-activity/WalkLiveActivity.swift` — `lastEventError` の赤バッジ表示
- Step A-2 の結果により追加（例: `apps/mobile/lib/auth/auth-store.ts`、`app.config.ts` の env、`expo-target.config.js`）

**Bug B**
- `apps/mobile/components/walk/WalkEventActions.tsx` — InteractionManager / AppState / setTimeout ガード追加
- `apps/mobile/app/(tabs)/walk.tsx` — `router.setParams({ action: undefined })` を条件満足時のみ呼ぶ

### 再利用する既存関数・構造体

- `WalkEventClientError`（`WalkEventClient.swift:3-11`）— そのまま `lastEventError` の source として使う
- `SharedWalkContext.write/clear`（`modules/walk-activity/ios/SharedWalkContext.swift`）— 既存、変更なし
- `useWalkStore.requestCamera/clearCameraRequest`（`stores/walk-store.ts:68`）— 既存、変更なし
- `InteractionManager` / `AppState`（React Native 標準）

### 検証手順

1. **ビルド**: `cd apps/mobile && npx expo prebuild --clean` → Xcode で Run（実機接続）
2. **Bug A 診断ラン**: ロック画面 Live Activity で pee をタップ。Live Activity に `⚠ missingToken` など理由表示されることを確認。Console.app で `subsystem == com.walkingdog.liveactivity` をフィルタしてログ確認。
3. **Bug A 根本修正後**: pee/poo をタップ → Live Activity の `lastEventKind` が "pee" / "poo" に更新される／アプリを前面に戻すと DB にイベントが反映されていることを `apps/api` の GraphQL で確認。
4. **Bug B**: 散歩中にアプリを完全 kill → ロック画面 📷 → Face ID → カメラ起動 → シャッター反応を確認。撮影後アプリに戻り、`WalkEvent.photo_url` が S3 の key で保存されることを確認。
5. **回帰**: アプリ内 Pee/Poo/📷 ボタンが従来通り動作すること（変更は deep link 経由 effect のみ）。
6. **ユニットテスト**: `apps/mobile` で `npm test`（Docker 経由）を通す。変更した React コンポーネントは既存テストの assertion が壊れないことを確認。

### 想定外のリスク

- Step A-1 で `WalkAttributes.ContentState` を拡張するとシリアライズ互換性のため、既存の進行中 Live Activity は一度終了して再作成する必要がある。対応: デプロイ後に古いまま動いている Live Activity は散歩終了時に自動で clear される。ユーザーにリスクは無い。
- Step A-2 の「理想対応（widget で refresh token 利用）」は今回スコープ外。
- Step B-1 の `setTimeout(150ms)` はアプリ内 📷 ボタン経路（通常 hot path）には影響しない（effect ではなく `handlePress` 直接呼び）。
