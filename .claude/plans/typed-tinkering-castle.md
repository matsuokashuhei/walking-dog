# 散歩中 iPhone ロック画面ウィジェット

## Context

散歩中にアプリを開かずロック画面から操作したい。表示要素：経過時間・距離・おしっこボタン・うんこボタン・カメラボタン。

**重要な技術的再定義**: iOS の仕様上、ユーザーが「ロック画面ウィジェット」と呼ぶ表示は、実際には **Live Activity (ActivityKit)** で実現する必要がある。

- Lock Screen Widget (WidgetKit) は `TimelineProvider` ベースで数分〜数時間単位の更新しかできず、秒単位のタイマー表示には不向き。インタラクティブボタンも限定的。
- **Live Activity** は散歩のような「進行中のセッション」専用に設計されており、ロック画面・Dynamic Island・StandBy に同時に表示される。`Text(timerInterval:)` で自己更新する経過時間、iOS 17+ の `AppIntent` ボタンをサポート。

よって本計画は **Live Activity ベースの実装** とする。

## 採用アーキテクチャ

### メカニズム
- **Live Activity (ActivityKit)**: `@bacons/apple-targets` で Widget Extension ターゲットを Expo 管理プロジェクトに追加し、SwiftUI でレイアウトを書く
- **経過時間**: `Text(timerInterval: startDate...)` — 自己ティック、プッシュ不要
- **距離**: `ContentState` に `distanceM` を持たせ、JS から GPS 更新ごとに `Activity.update()` を呼ぶ
- **pee / poo ボタン**: `AppIntent` with `openAppWhenRun = false` — ロック解除せずバックグラウンドで GraphQL `recordWalkEvent` を Swift から直接叩く
- **camera ボタン**: `AppIntent` with `openAppWhenRun = true` + ディープリンク `walking-dog://walk?action=camera` — アプリをカメラ起動状態で開く（Face ID 解除が走る）

### iOS バージョン戦略
- **最低 iOS 17.0**（ユーザー確認済み）。インタラクティブ `AppIntent` ボタン前提のため iOS 16 は切り捨て
- app.config.ts の `ios.deploymentTarget: '17.0'` を明示設定
- iOS 16 デバイスでは Live Activity 自体を起動しない（JS 側で guard）

### 認証トークン共有
- App ↔ Extension 間で **App Group Keychain (Keychain Access Groups)** を使って access / refresh token を共有
- `expo-secure-store` のキーチェーン保存先をカスタム access group に変更する必要あり（native 設定）
- Extension 側（Swift）は Keychain から token を読んで `URLSession` で GraphQL を叩く
- 401 時は refresh token で再取得、失敗したら Live Activity に「再サインイン必要」表示

### データフロー
```
Walk 開始 (JS)
  → startWalk mutation → walkId 取得
  → ActivityManager.startActivity({walkId, dogIds, startedAt}) ─── RN Native Module
  → App Group UserDefaults に walkId 書き込み
  → Live Activity 表示 (Lock Screen + Dynamic Island)

GPS 更新 (JS, 5s 間隔)
  → walkStore.addPoint → totalDistanceM 更新
  → ActivityManager.updateActivity({distanceM}) ─── デバウンス 10s

pee ボタン (AppIntent, バックグラウンド)
  → App Group から walkId + auth token 取得
  → GraphQL recordWalkEvent 直接 POST
  → Activity.update で lastEvent バッジ表示

camera ボタン (AppIntent, ディープリンク)
  → アプリ起動 → Expo Router が /(tabs)/walk?action=camera を処理
  → WalkEventActions の handlePhoto を自動実行

Walk 終了 (JS)
  → finishWalk → ActivityManager.endActivity()
```

## 新規ファイル

### iOS ネイティブ（`apps/mobile/targets/walk-live-activity/`）
- `WalkAttributes.swift` — ActivityAttributes（walkId, dogName, startedAt）+ ContentState（distanceM, lastEvent）
- `WalkLiveActivity.swift` — SwiftUI レイアウト（ロック画面 + Dynamic Island compact/expanded/minimal）
- `PeeIntent.swift`, `PooIntent.swift` — `AppIntent` バックグラウンド実行
- `CameraIntent.swift` — `AppIntent` with `openAppWhenRun = true`
- `WalkEventClient.swift` — GraphQL ミニマル HTTP クライアント（URLSession）
- `SharedKeychain.swift` — Access Group 対応 Keychain 読み取り
- `Info.plist`, `walk-live-activity.entitlements`

### Expo config plugin（`apps/mobile/plugins/`）
- `with-live-activity.ts` — Info.plist に `NSSupportsLiveActivities=true`, `NSSupportsLiveActivitiesFrequentUpdates=true` を追加、App Group と Keychain Access Group を entitlements に設定
- `@bacons/apple-targets` の target 定義（config plugin が参照）

### RN Native Module（`apps/mobile/modules/walk-activity/`）
- Expo Module として作成（`create-expo-module` の形式）
- `ios/WalkActivityModule.swift` — `startActivity`, `updateActivity`, `endActivity` を公開
- `src/index.ts` — TypeScript 型定義 + wrapper

### JS 統合
- `apps/mobile/lib/walk/live-activity.ts` — Native Module の薄いラッパー（フラグで iOS 16.1+ のみ呼ぶ）
- `apps/mobile/stores/walk-store.ts` の **修正**:
  - `startRecording` 内で `liveActivity.start(...)` 呼び出し
  - `addPoint` 後にデバウンスで `liveActivity.update({distanceM})` 呼び出し
  - `finish` / `reset` で `liveActivity.end()`
- `apps/mobile/app/(tabs)/walk.tsx` の **修正**: `useLocalSearchParams` で `action=camera` を受け取ったら自動で `handlePhoto` を起動

### Keychain アクセスグループ設定
- `apps/mobile/plugins/with-secure-store-access-group.ts` — `expo-secure-store` の保存先を App Group Keychain にするカスタム plugin（既存 plugin には該当オプションがないので自作 / アップデート要）

## 既存ファイル修正

| ファイル | 変更内容 |
|---|---|
| `apps/mobile/app.config.ts` | `ios.deploymentTarget: '16.1'`, App Group `group.com.walkingdog.app`, `plugins` に `@bacons/apple-targets`, `with-live-activity`, `with-secure-store-access-group` を追加 |
| `apps/mobile/package.json` | `@bacons/apple-targets`, `expo-modules-core` 依存を追加 |
| `apps/mobile/stores/walk-store.ts` | Live Activity ライフサイクル呼び出しを追加 |
| `apps/mobile/lib/walk/gps-tracker.ts` | 距離変化閾値を満たしたら Activity update トリガー |
| `apps/mobile/components/walk/WalkEventActions.tsx` | deep link 経由の自動 `handlePhoto` 発火は walk.tsx 側で行うためここは変更なし（確認のみ） |
| `apps/mobile/app/(tabs)/walk.tsx` | `useLocalSearchParams.action === 'camera'` のハンドリング追加 |
| `apps/mobile/eas.json` | 新規作成 — development / preview / production プロファイル。Expo Go 非対応機能のため dev-client 必須 |

## 再利用する既存コード
- `apps/mobile/hooks/use-walk-event-mutations.ts` — JS 側の pee/poo/photo ロジックはそのまま使える（deep link から呼ぶ）
- `apps/mobile/lib/walk/distance.ts` — `haversineDistance` — 距離計算ロジックは Swift に複製せず、JS 側で計算して Activity に push
- `apps/api/src/services/walk_event_service.rs` — `recordWalkEvent` mutation はそのまま使う。Swift 側から同じ GraphQL を叩く
- `apps/mobile/lib/api/client.ts`（要確認）— GraphQL エンドポイント URL を Swift に定数として渡す（config plugin で Info.plist に書く）

## API 側の変更
- **基本は変更なし**。既存 `recordWalkEvent` と `generateWalkEventPhotoUploadUrl` を Swift から叩くだけ
- ただし Swift 側は Apollo を使わず手書きの GraphQL POST にするため、エラー契約・認証ヘッダ形式（`Authorization: Bearer`）のみドキュメント化

## スコープ外（今回やらない）
- Android ホーム画面ウィジェット — iOS 専用機能として開始
- バックグラウンド GPS 追跡（フォアグラウンドで walk 中のみ想定）— 現状 `isBackgroundEnabled: false`
- 写真ボタンから **直接** カメラ UI をロック画面に表示 — iOS 制約で不可能、アプリ起動経由
- StandBy / Apple Watch
- Live Activity 用プッシュ通知チャネル — Phase 1 は端末内更新のみ

## 段階的実装（phase 分け）

### Phase 1: 骨組みと表示（インタラクションなし）
1. `@bacons/apple-targets` セットアップ、空の Widget Extension ターゲットを prebuild で生成できる状態に
2. `WalkAttributes` + `WalkLiveActivity` の SwiftUI（時間・距離の表示のみ、ボタンはダミー）
3. Expo Module で `startActivity` / `updateActivity` / `endActivity` 実装
4. `walk-store` のライフサイクル統合、実機で経過時間・距離がロック画面に出ることを確認

### Phase 2: AppIntent ボタン（iOS 17+）
5. App Group + Keychain Access Group 設定、`expo-secure-store` を access group 対応に
6. `WalkEventClient.swift` — GraphQL ミニクライアント、認証ヘッダ付き POST
7. `PeeIntent`, `PooIntent` 実装 + SwiftUI に `Button(intent:)` 配置
8. 401 時の refresh token フロー

### Phase 3: カメラディープリンク
9. `CameraIntent` with `openAppWhenRun = true` + `walking-dog://walk?action=camera`
10. `walk.tsx` で deep link ハンドリング、`handlePhoto` 自動呼び出し

### Phase 4: Dynamic Island + 仕上げ
11. Dynamic Island compact / expanded / minimal レイアウト
12. アクセシビリティラベル、VoiceOver 検証
13. iOS 16 デバイスは Live Activity を起動しない guard を JS 側に追加

## 検証方法
- **実機必須**（シミュレータは Live Activity 動作するが AppIntent 挙動の一部が異なる）
- `eas build --profile development --platform ios` でビルド、iPhone にインストール
- 犬選択 → 散歩開始 → iPhone をロック
- ロック画面で経過時間が秒単位で進むこと確認
- 5〜10 秒歩いて距離が更新されること確認
- pee ボタンタップ → 画面遷移せず、アプリ内イベント一覧に「pee」が追加されていること（アプリを開いて確認）
- poo ボタンも同様
- camera ボタン → Face ID → カメラ起動 → 撮影 → walk に photo イベント追加
- 散歩終了 → Live Activity 消滅
- iOS 16 実機では Live Activity が出ないこと（silent skip）確認

## リスクと未解決事項
1. **Keychain Access Group 共有**: `expo-secure-store` は現状 access group 指定オプションがない。カスタム plugin で Objective-C レベルのビルド設定注入が必要。規模次第で refresh token だけ別経路で共有する妥協案もあり
2. **Token refresh の排他制御**: アプリ本体と Extension が同時に refresh を走らせた場合の競合
3. **Live Activity の頻繁更新制限**: iOS は 1 時間あたりの update 回数を制限。距離更新は最低 10s デバウンス必須
4. **`@bacons/apple-targets` 成熟度**: 2026 時点でのメンテ状況を確認する必要あり。代替は bare workflow 化
5. **既存の `isBackgroundEnabled: false`（BLE）との整合性**: Live Activity 自体は BG 不要だが、散歩中に画面が消えたときの GPS 追跡は別途 UIBackgroundModes 設定が必要（今回スコープ外だが UX 上ほぼ必須）

## 見積もりの目安
- Phase 1: 2-3 日（Expo Module 初回セットアップ込み）
- Phase 2: 3-4 日（Keychain 共有が最大リスク）
- Phase 3: 0.5 日
- Phase 4: 1-2 日
- 合計: 約 1.5 週間（実機検証含む）
