# 散歩中イベント記録機能（おしっこ / うんこ / 写真）

## Context

### 目的
飼い主が散歩中に発生する代表的な出来事（排泄・記念写真）を手早く記録し、後から振り返れるようにする。排泄記録は犬の健康管理（回数・時間・場所のトレンド把握）に、写真は思い出として活用される。現在、散歩セッションでは GPS 点列と距離・時間しか記録されず、散歩の「中身」が欠落している。

### ユーザーストーリー
- **US-1**: 飼い主として、散歩中に犬がおしっこをしたら、画面上のボタンをワンタップで記録したい — 後から排泄トレンドを確認するため
- **US-2**: 飼い主として、うんこをした場所を GPS 付きで記録したい — 散歩ルートの振り返りと異常検知のため
- **US-3**: 飼い主として、散歩中の可愛い瞬間を写真で残し、散歩記録と紐付けたい — 思い出として時系列に振り返るため
- **US-4**: 飼い主として、散歩結果画面でイベントを時系列タイムラインと地図ピンの両方で確認したい — どこで何があったかを直感的に把握するため

### やること
1. 散歩記録中の画面（`phase === 'recording'`）に「おしっこ」「うんこ」「カメラ」のアクションボタンを追加し、タップで即座にイベント登録
2. 写真イベントは `expo-image-picker` のカメラ起動 → S3 直接アップロード → CloudFront 経由配信（既存の犬プロフィール写真の仕組みをそのまま流用）
3. 散歩結果画面（`/walks/[id]`）に時系列タイムラインを追加し、マップ上にもイベントピンを表示

### 決定した設計方針（ユーザー確認済み）
- ストレージ: PostgreSQL の新テーブル `walk_events`（encounter と同じパターン）
- 写真入力: カメラ撮影のみ（`launchCameraAsync`）
- 送信タイミング: その場で即座に API 送信（encounter と同じパターン）
- 結果表示: 時系列タイムライン + マップ上のピン両方

### スコープ外（本 PR でやらないこと）
- イベントの**編集・削除**機能（将来 PR）
- 複数頭同時散歩時の **dog_id 選択 UI**（本 PR では単頭なら自動、複数頭は NULL で walk レベル記録）
- **オフラインキュー**（通信失敗時の永続化・バックグラウンド再送）。本 PR では即時リトライのみ
- **ギャラリーからの写真選択**（カメラ撮影のみ）
- **写真圧縮以外の編集機能**（クロッピング、フィルター等）
- **写真削除時の S3 オブジェクト削除**（削除機能自体がスコープ外）
- **プッシュ通知や共有機能**

### 非機能要件
- **エラーハンドリング方針**:
  - 即時送信の mutation 失敗時は、Alert で「記録に失敗しました。もう一度お試しください」を表示し、楽観的更新はロールバック（store から削除）
  - 写真アップロードの3フロー（presigned URL 取得 → S3 PUT → recordWalkEvent）はどこで失敗しても同じ Alert でフィードバックし、S3 に途中までアップロードされたオブジェクトはそのまま（ゴミだが DB 参照なし）
  - 位置情報が取得できていない（`points` 配列が空）場合は `lat`/`lng` 未送信で記録。後で地図ピンは表示されないがタイムラインには表示される
- **パフォーマンス**: イベント記録は 2 秒以内に UI フィードバック（楽観的更新は即時、API レスポンスでステータス確定）
- **セキュリティ**:
  - S3 presigned PUT の `content_type` は白リスト化（`image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp`）— 既存の `s3_service::extension_for_content_type` を再利用（MEMORY の `pattern_s3_presigned_content_type.md` 準拠）
  - presign 時と PUT 時で `Content-Type` を一致させる（SigV4 署名対象）
  - 認可: walk のオーナーか walk に含まれる犬の `dog_members` であること
- **写真サイズ上限**: `expo-image-picker` の `quality: 0.8` で圧縮。それ以外のサイズ上限は設けない（既存の犬プロフィール写真と同じ扱い）
- **時刻の扱い**: `occurred_at` はクライアントから RFC3339 文字列で送信。`created_at` はサーバー側 `NOW()`。両者乖離してもクライアント時刻を優先（オフライン後の同期時を想定）

### 制約事項
- 許可 content_type: `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp`（既存の犬写真と同じ）
- `occurred_at` フォーマット: RFC3339（例: `2026-04-12T12:34:56.789+09:00`）
- `lat` 範囲: -90〜90, `lng` 範囲: -180〜180
- `event_type` は `'pee' | 'poo' | 'photo'` のみ（CHECK 制約で DB 側でも強制）
- `photo_url` は `event_type='photo'` の時のみ必須、他では NULL（DB CHECK 制約）

### dog_id 決定ロジック（クライアント側）
- **単頭散歩**（`selectedDogIds.length === 1`）: 自動的にその `dogId` を設定
- **複数頭散歩**（`selectedDogIds.length > 1`）: `dog_id = NULL`（walk レベル記録）
- この方針は将来の「どの犬か選択 UI」実装で dog_id を埋めるだけで済むよう、nullable カラムで設計済み

### 受け入れ基準（Given/When/Then）
- **AC-1**: GIVEN 散歩中（recording phase）の画面、WHEN ユーザーが「おしっこ」ボタンをタップ、THEN 2秒以内にタイムラインにエントリが追加される（成功時）or Alert が表示される（失敗時）
- **AC-2**: GIVEN 散歩中の画面、WHEN ユーザーが「うんこ」ボタンをタップ、THEN AC-1 と同じ（event_type のみ異なる）
- **AC-3**: GIVEN 散歩中の画面、WHEN ユーザーが「カメラ」ボタンをタップ、THEN `expo-image-picker` のカメラが起動、撮影後 S3 へアップロード、その後タイムラインに写真サムネイル付きエントリが追加される
- **AC-4**: GIVEN 散歩終了後の結果画面、WHEN ユーザーが画面を開く、THEN 時系列にソートされたイベントタイムラインと、地図上の該当位置にピン（絵文字アイコン）が表示される
- **AC-5**: GIVEN 結果画面で写真エントリ、WHEN ユーザーがサムネイルをタップ、THEN フルスクリーンで写真が表示される
- **AC-6**: GIVEN 他ユーザーの散歩、WHEN 認証情報なしで `recordWalkEvent` を呼ぶ、THEN 403/Unauthorized エラーが返る
- **AC-7**: GIVEN 位置情報が未取得の状態（`points` 配列が空）、WHEN pee/poo ボタンをタップ、THEN `lat`/`lng` 未送信で記録成功し、結果画面のタイムラインには表示されるが地図ピンはつかない

## アーキテクチャ決定

### データモデル
`walk_events` テーブル（PostgreSQL）:

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID PK | `gen_random_uuid()` |
| `walk_id` | UUID FK NOT NULL | → `walks.id` ON DELETE CASCADE |
| `dog_id` | UUID FK NULL | → `dogs.id` ON DELETE SET NULL（単頭散歩は自動設定、複数頭は NULL 可） |
| `event_type` | TEXT NOT NULL | CHECK制約: `'pee' | 'poo' | 'photo'` |
| `occurred_at` | TIMESTAMPTZ NOT NULL | クライアントから送信 |
| `lat` | DOUBLE PRECISION NULL | GPS 取得できた場合のみ |
| `lng` | DOUBLE PRECISION NULL | GPS 取得できた場合のみ |
| `photo_url` | TEXT NULL | `event_type='photo'` の場合のみ。S3 キー形式（`walks/{walkId}/{uuid}.jpg`） |
| `created_at` | TIMESTAMPTZ NOT NULL | サーバー側で `NOW()` |

インデックス: `(walk_id, occurred_at)` — タイムライン取得用

CHECK制約:
- `event_type IN ('pee', 'poo', 'photo')`
- `(event_type = 'photo') = (photo_url IS NOT NULL)` — 写真型なら必須、他は NULL

### GraphQL API

新規 mutation:
```graphql
type WalkEvent {
  id: ID!
  walkId: ID!
  dogId: ID
  eventType: String!           # "pee" | "poo" | "photo"
  occurredAt: String!          # RFC3339
  lat: Float
  lng: Float
  photoUrl: String             # CloudFront URL に変換済み（既存 DogOutput パターン）
}

# 1. 写真用 presigned URL 発行（photo 時のみ先に呼ぶ）
generateWalkEventPhotoUploadUrl(walkId: ID!, contentType: String!): PresignedUrlOutput!

# 2. イベント記録（全イベント共通）
recordWalkEvent(input: RecordWalkEventInput!): WalkEvent!

input RecordWalkEventInput {
  walkId: ID!
  dogId: ID
  eventType: String!
  occurredAt: String!
  lat: Float
  lng: Float
  photoKey: String    # eventType='photo' の時のみ必須、S3キー
}
```

既存の walk 取得フィールドに `events: [WalkEvent!]!` リゾルバを追加（`occurred_at ASC` ソート）。

### 認可
- `recordWalkEvent`: 認証済みユーザーが walk のオーナーまたは walk に含まれる犬のメンバー
- `generateWalkEventPhotoUploadUrl`: 同上
- 既存 `walk_service` の権限確認パターンを踏襲

### 写真フロー（既存パターン踏襲）
1. `launchCameraAsync({ allowsEditing: false, quality: 0.8 })` で撮影
2. `generateWalkEventPhotoUploadUrl(walkId, contentType)` → `{ url, key }`
3. `uploadToPresignedUrl(url, uri, contentType)` → S3 にPUT
4. `recordWalkEvent({ walkId, eventType: 'photo', occurredAt, lat, lng, photoKey: key })`

S3 キー形式: `walks/{walkId}/{uuid}.{ext}` — 既存 `dogs/{dogId}/{uuid}.{ext}` と別プレフィックスにすることで衝突回避。バケットは既存 `dog-photos` バケット（名前は汎用化せず現状流用）を再利用。

### モバイル UI

#### 散歩記録中（`phase === 'recording'`）
既存 `WalkControls` の下に新規コンポーネント `WalkEventActions` を配置:

```
┌─────────────────────────┐
│  [Map]                  │
│                         │
├─────────────────────────┤
│  DURATION  | DISTANCE   │
├─────────────────────────┤
│  🚽  💩  📷             │  ← WalkEventActions
│  Pee Poo Photo          │
├─────────────────────────┤
│  [Finish]               │
└─────────────────────────┘
```

- ボタンタップ → 最新 GPS 点を store から取得 → `recordWalkEvent` mutation → 成功通知（トーストまたは軽いフィードバック）
- 写真ボタンは上記フローに沿ってカメラ起動

#### 散歩結果画面（`/walks/[id]`）
既存のマップと統計表示の下に `WalkEventTimeline` を追加。マップ内には `WalkEventMarker` をイベント位置に表示。

```
Map (polyline + event pins: 🚽 💩 📷)
Date / Dogs / Time range
Walker info
Statistics (duration, distance)
─────
Events Timeline
  09:12  🚽 Pee    （ポチ）
  09:18  💩 Poo    （ポチ）
  09:25  📷 Photo  [thumbnail tap→full screen]
```

## 実装タスク一覧

TDD 順序。各タスクは Inspector 品質ゲートを通す。

### フェーズ 1: API（`apps/api/**`）— `implementer-api_ja`

**A1. マイグレーション**
- 対象: `apps/api/migration/src/mXX_create_walk_events.rs`（新規）と `migration/src/lib.rs` 登録
- テスト: 既存 migration テスト経路（`cargo run --package migration -- up` 相当を Docker 経由）
- 検証: `docker compose -f apps/compose.yml exec db psql -c '\d walk_events'` でテーブル構造確認

**A2. Entity**
- 対象: `apps/api/src/entities/walk_events.rs`（新規、`mod.rs` に追加）
- テスト: `tests/test_walk_events.rs` に find by walk_id の基本テスト
- 参考雛形: `apps/api/src/entities/encounters.rs`

**A3. Service**
- 対象: `apps/api/src/services/walk_event_service.rs`（新規、`mod.rs` 登録）
  - `record_event(db, walk_id, user_id, input) -> Result<Model>` — 権限確認 + INSERT
  - `list_events(db, walk_id) -> Result<Vec<Model>>` — occurred_at ASC
- テスト: service レベルの単体テスト（`tests/test_walk_events.rs` 内）
- 参考雛形: `apps/api/src/services/encounter_service.rs`

**A4. S3 service 拡張**
- 対象: `apps/api/src/services/s3_service.rs`
  - 新関数 `generate_walk_event_photo_upload_url(walk_id, content_type)` — 既存 `generate_dog_photo_upload_url` をコピー改変、キーを `walks/{walk_id}/{uuid}.{ext}` 形式に
  - `extension_for_content_type` はそのまま再利用
- テスト: `tests/test_walk_events.rs` で presigned URL 形式検証

**A5. GraphQL mutations**
- 対象: `apps/api/src/graphql/custom_mutations.rs`
  - `generate_walk_event_photo_upload_url_field` を追加（既存 `generate_dog_photo_upload_url_field` を雛形に）
  - `record_walk_event_field` を追加
  - `WalkEventOutput` 型と `photoUrl` フィールドの CloudFront URL 変換リゾルバ（既存 `DogOutput` の photoUrl 解決パターン）
- テスト: `tests/test_walk_events.rs` に GraphQL mutation テスト（3種類のイベント記録 + 権限テスト）

**A6. walk.events リゾルバ**
- 対象: `custom_queries.rs` の `walk_by_id_field` と `my_walks_field` 相当
  - `WalkOutput` に `events` フィールドを追加
  - 遅延ロード方式（既存 `dogs`/`points` と同じ）
- テスト: `tests/test_walk.rs` を拡張、または `test_walk_events.rs` で walk クエリからイベント取得を確認

### フェーズ 2: Mobile（`apps/mobile/**`）— `implementer-mobile_ja`

**M1. 型定義と GraphQL**
- 対象:
  - `apps/mobile/lib/graphql/mutations.ts` に `RECORD_WALK_EVENT_MUTATION` と `GENERATE_WALK_EVENT_PHOTO_UPLOAD_URL_MUTATION`
  - `apps/mobile/lib/graphql/queries.ts` の walk query に `events` フィールド追加
  - `apps/mobile/types/walk.ts`（存在しなければ新設）に `WalkEvent` 型

**M2. Hooks**
- 対象: `apps/mobile/hooks/use-walk-event-mutations.ts`（新規）
  - `useRecordWalkEvent()` — TanStack Query mutation
  - `useGenerateWalkEventPhotoUploadUrl()`
- 参考雛形: `apps/mobile/hooks/use-dog-mutations.ts`
- テスト: `use-walk-event-mutations.test.ts`

**M3. Zustand 拡張**
- 対象: `apps/mobile/stores/walk-store.ts`
  - `events: WalkEvent[]` フィールド
  - `addEvent(event)` アクション
  - `reset()` で空配列に戻す
- テスト: `stores/walk-store.test.ts` を拡張

**M4. WalkEventActions コンポーネント**
- 対象: `apps/mobile/components/walk/WalkEventActions.tsx`（新規）
  - 3ボタン（🚽/💩/📷）横並び
  - pee/poo タップ: `recordWalkEvent` 即時発火、最新 GPS 点を利用
  - photo タップ: カメラ起動 → presigned URL → S3 PUT → `recordWalkEvent`
  - 成功時に `walk-store.addEvent` で楽観的更新
- テスト: `WalkEventActions.test.tsx` — モック越しに mutation 呼び出しを検証、カメラフローは `jest.mock('expo-image-picker')` で分離

**M5. WalkEventTimeline コンポーネント**
- 対象: `apps/mobile/components/walk/WalkEventTimeline.tsx`（新規）
  - 時刻フォーマット（`formatClockTime` 既存を再利用）
  - 写真はサムネイル表示、タップでフルスクリーン（`expo-image` + モーダル）
- テスト: `WalkEventTimeline.test.tsx` — 3種類のイベント表示、空状態

**M6. マップピン**
- 対象: 既存 `WalkMap` コンポーネント（`apps/mobile/components/walk/WalkMap.tsx`）を拡張
  - `events: WalkEvent[]` prop を追加
  - `react-native-maps` の `Marker` で各イベントをピン表示（絵文字アイコン）
- テスト: 既存のマップテストに props 追加

**M7. 画面統合**
- `apps/mobile/app/(tabs)/walk.tsx` (recording phase): `<WalkEventActions />` を `WalkControls` の前に配置
- `apps/mobile/app/walks/[id].tsx`: Query 結果から `events` を取得し `<WalkEventTimeline events={...} />` を追加、`<WalkMap points={...} events={...} />` に events を渡す
- テスト: 画面レベルのスナップショットは必要に応じて

### フェーズ 3: E2E（`apps/e2e/**`）

**E1. GraphQL E2E テスト**
- 対象: `apps/e2e/tests/api/walk-events.spec.ts`（新規）
  - シナリオ: 散歩開始 → pee 記録 → poo 記録 → photo用presigned URL発行 → 写真PUT → photo記録 → 散歩取得 → events 3件確認
- 参考雛形: `apps/e2e/tests/api/walks.spec.ts`

**E2. モバイル UI E2E**（任意、品質ゲート次第）
- 対象: `apps/e2e/tests/mobile/walk-events.spec.ts`
- シナリオ: ダミー犬作成 → 散歩開始 → pee/poo ボタンタップ → 終了 → 結果画面でタイムライン確認

## 改修する既存ファイル一覧

**API**:
- `apps/api/migration/src/lib.rs`（新 migration 追加）
- `apps/api/src/entities/mod.rs`（walk_events 追加）
- `apps/api/src/services/mod.rs`（walk_event_service 追加）
- `apps/api/src/services/s3_service.rs`（generate_walk_event_photo_upload_url 追加）
- `apps/api/src/graphql/custom_mutations.rs`（mutation 2 本 + WalkEventOutput 追加）
- `apps/api/src/graphql/custom_queries.rs`（walk.events フィールド追加）

**Mobile**:
- `apps/mobile/lib/graphql/mutations.ts`
- `apps/mobile/lib/graphql/queries.ts`
- `apps/mobile/stores/walk-store.ts`
- `apps/mobile/components/walk/WalkMap.tsx`
- `apps/mobile/app/(tabs)/walk.tsx`
- `apps/mobile/app/walks/[id].tsx`

**新規**:
- `apps/api/migration/src/mXX_create_walk_events.rs`
- `apps/api/src/entities/walk_events.rs`
- `apps/api/src/services/walk_event_service.rs`
- `apps/api/tests/test_walk_events.rs`
- `apps/mobile/hooks/use-walk-event-mutations.ts`
- `apps/mobile/components/walk/WalkEventActions.tsx`
- `apps/mobile/components/walk/WalkEventTimeline.tsx`
- 上記の `.test.ts(x)` 群
- `apps/e2e/tests/api/walk-events.spec.ts`

## 再利用する既存のユーティリティ

| ユーティリティ | パス | 用途 |
|---------------|------|------|
| `uploadToPresignedUrl` | `apps/mobile/lib/upload.ts` | 写真 S3 PUT |
| `extension_for_content_type` | `apps/api/src/services/s3_service.rs:18` | MIME→拡張子 |
| `generate_presigned_put_url` | `apps/api/src/services/s3_service.rs` | Presigned URL 生成 |
| `formatClockTime` | `apps/mobile/lib/walk/format.ts` | タイムライン時刻 |
| `WalkMap` | `apps/mobile/components/walk/WalkMap.tsx` | マップ + ピン |
| encounter パターン | `apps/api/src/services/encounter_service.rs` | service 雛形 |
| dog photo upload | `apps/mobile/app/dogs/[id]/edit.tsx:22-34` | 写真フロー雛形 |

## パイプライン実行計画

プラン承認後、以下を順次実行する。

1. **Step 0**: `feature/walk-events` ブランチ作成、TaskCreate で全ステージ登録
2. **Step 1**: Interviewer（`interviewer_ja`）は本計画で要件確定済みのためスキップせず、上記 Context を仕様書として Inspector に検査させる（1.5）
3. **Step 2**: Explorer（完了済み、本計画に反映済みのためスキップ。Inspector には探索完了レポートを提示）
4. **Step 3**: Planner（`code-architect`, opus）に本計画を提示し TDD チェックリスト形式に精緻化、タスクチェックリストを生成
5. **Step 3.5**: Inspector（`inspector_ja`）で計画検査
6. **Step 4**: Implementers を並列/順次起動
   - API 先行（`implementer-api_ja`）— migration + entity + service + GraphQL + API テスト
   - API DONE 後 Mobile（`implementer-mobile_ja`）— GraphQL が必要なため順次
   - E2E は最終統合後
7. **Step 4.5**: Inspector で実装検査（`cargo test`, `npm test`, 型チェック）
8. **Step 5**: Simplifier（`code-simplifier`, sonnet）
9. **Step 5.5**: 仕様準拠チェックリスト
10. **Step 6**: レビュー並列（`code-reviewer`, `silent-failure-hunter`, `type-design-analyzer`（新規型あり））
11. **Step 6.5**: Inspector でレビュー検査
12. **Step 7**: Tester（`tester_ja`）— カバレッジ検証、E2E 実行
13. **Step 7.5**: Inspector でテスト検査
14. **Step 8**: `finishing-a-development-branch` で PR 作成

## 検証手順（End-to-End）

プラン完了判定の具体的な確認方法:

1. **マイグレーション**:
   ```
   docker compose -f apps/compose.yml run --rm migration
   docker compose -f apps/compose.yml exec db psql -U postgres -d walking_dog -c '\d walk_events'
   ```

2. **API ユニット/統合テスト**:
   ```
   docker compose -f apps/compose.yml run --rm api cargo test --package api test_walk_events
   ```

3. **モバイル ユニットテスト**:
   ```
   docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern='walk-event'
   ```

4. **型チェック**:
   ```
   docker compose -f apps/compose.yml run --rm mobile npx tsc --noEmit
   docker compose -f apps/compose.yml run --rm api cargo check
   ```

5. **E2E**:
   ```
   docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test walk-events --project API
   ```

6. **手動確認（iOS Simulator 経由）**:
   - アプリを起動し犬を1頭作成、散歩開始
   - pee / poo / photo をそれぞれタップし即座に反映されることを確認
   - 散歩終了 → 結果画面でタイムラインと地図上のピンを確認
   - 写真タップでフルスクリーン表示を確認

## リスク / 注意点

1. **複数頭散歩での dog_id**: 初回実装は `dog_id = NULL` で walk レベル記録とする。将来「誰がしたか」選択 UI を追加するための余地を残す（nullable カラムで設計済み）
2. **オフライン時のイベント記録**: 即時送信方式のため、通信失敗時は store に一時保存して再送する簡易リトライを入れる（`WalkEventActions` 内）。完全なオフラインキューは本 PR のスコープ外
3. **写真撮影中の GPS**: カメラ UI 起動中は GPS tracker が動き続けるため、撮影完了時の最新点をイベントに紐付ける
4. **CloudFront 配信**: 既存の `dog-photos` バケット + CloudFront distribution をそのまま流用。`walks/` プレフィックスのキャッシュ設定は既存と同じで問題ない
5. **写真削除**: 本 PR では削除機能は範囲外。将来イベント削除 mutation を追加する際に S3 オブジェクト削除も併せて実装

## 完了条件

- [ ] `walk_events` テーブル作成済み、マイグレーション成功
- [ ] 3種のイベントが API 経由で登録・取得できる（E2E 1 本パス）
- [ ] モバイル記録画面にアクションボタンが表示され、タップで即記録
- [ ] カメラ撮影→S3→CloudFront 経由で結果画面に写真表示
- [ ] 結果画面にタイムラインと地図ピンが表示
- [ ] 新規テスト（API / Mobile 双方）が追加され全て PASS
- [ ] `cargo check` / `tsc --noEmit` エラーなし
- [ ] Inspector 全ゲート PASS
- [ ] PR 作成準備完了

---

## TDD タスクチェックリスト（Planner 生成）

### 選択したアプローチ

**採用方針**: 「API 先行 → Mobile → E2E」の垂直スライスを、レイヤーごとに **RED → GREEN → REFACTOR** で回す。

**検討した代替案**:
1. **機能軸での完全垂直スライス** — `walk_events` テーブル設計が 3 種共通で、DB マイグレーションを 3 回分割するオーバーヘッドが大きく不採用
2. **フロント先行（モックサーバー）** — CHECK 制約・認可ロジックの検証が後段になるリスクがあるため不採用
3. **採用したレイヤー直列案** — API のテストカバレッジを早期に担保、Mobile 実装中に API 仕様の手戻りがない

**E2E 自動化判断**:
- API E2E は必須（AC-1/AC-2/AC-3/AC-6/AC-7）
- Mobile UI E2E は pee/poo/結果画面のみ自動化、AC-3（カメラ）は iOS Simulator 手動検証
- AC-5（写真フルスクリーン）は `WalkEventTimeline.test.tsx` のユニットテストで検証

### 要件カバレッジ

| 要件 | カバーするタスク |
|---|---|
| US-1 / AC-1 (pee) | T-A3, T-A5, T-M4, T-E1, T-E2 |
| US-2 / AC-2 (poo) | T-A3, T-A5, T-M4, T-E1, T-E2 |
| US-3 / AC-3 (photo) | T-A4, T-A5, T-M4, T-E1（API フロー）, 手動検証 |
| US-4 / AC-4 (result display) | T-A6, T-M5, T-M6, T-M7, T-E2 |
| AC-5 (fullscreen) | T-M5（ユニットテスト） |
| AC-6 (authz) | T-A3, T-A5, T-E1 |
| AC-7 (no GPS) | T-A3, T-A5, T-M4, T-E1 |

### タスク一覧

#### T-A1: マイグレーション `walk_events` テーブル
- **対象**: `apps/api/migration/src/m20260412_000001_create_walk_events.rs`（新規）, `apps/api/migration/src/lib.rs`
- **GREEN**: カラム、CHECK 制約 2 本（`event_type IN ('pee','poo','photo')`, `(event_type='photo')=(photo_url IS NOT NULL)`）、`(walk_id, occurred_at)` インデックス、FK（walks CASCADE / dogs SET NULL）
- **検証**: `docker compose -f apps/compose.yml run --rm migration` + `\d walk_events`
- **完了条件**: 9 カラム、CHECK 2 本、インデックス存在
- **依存**: なし

#### T-A2: Entity `walk_events.rs`
- **対象**: `apps/api/src/entities/walk_events.rs`（新規）, `entities/mod.rs`, `entities/prelude.rs`
- **テスト**: `apps/api/tests/test_walk_events.rs`（新規） — `find_by_walk_id_returns_empty_for_new_walk`
- **検証**: `docker compose -f apps/compose.yml run --rm api cargo test --package api test_walk_events -- --test-threads=1`
- **依存**: T-A1

#### T-A3: Service `walk_event_service.rs`
- **対象**: `apps/api/src/services/walk_event_service.rs`（新規）, `services/mod.rs`
- **RED テスト**:
  - `record_event_pee_inserts_row`
  - `record_event_rejects_non_owner`（AC-6）
  - `record_event_without_gps_succeeds`（AC-7）
  - `record_event_photo_requires_photo_key`
  - `list_events_returns_in_occurred_at_asc`
- **GREEN**: `record_event(db, walk_id, user_id, input)`, `list_events(db, walk_id)` — encounter_service の権限確認パターン踏襲
- **依存**: T-A2

#### T-A4: S3 service 拡張（T-A1〜A3 と並列可）
- **対象**: `apps/api/src/services/s3_service.rs`
- **RED テスト**:
  - `generate_walk_event_photo_upload_url_returns_presigned_put_with_walks_prefix`
  - `generate_walk_event_photo_upload_url_rejects_invalid_content_type`
- **GREEN**: `generate_dog_photo_upload_url` 複製、キーを `walks/{walk_id}/{uuid}.{ext}`
- **依存**: なし

#### T-A5: GraphQL mutation 2 本 + `WalkEventOutput`
- **対象**: `apps/api/src/graphql/custom_mutations.rs`
- **RED テスト**:
  - `mutation_record_walk_event_pee_returns_event`
  - `mutation_record_walk_event_photo_resolves_cloudfront_url`
  - `mutation_record_walk_event_unauthenticated_returns_error`（AC-6）
  - `mutation_generate_walk_event_photo_upload_url_returns_key`
- **GREEN**: `WalkEventOutput`, `photoUrl` リゾルバで CloudFront URL 変換、`record_walk_event_field`, `generate_walk_event_photo_upload_url_field`
- **依存**: T-A3, T-A4

#### T-A6: `walk.events` リゾルバ
- **対象**: `apps/api/src/graphql/custom_queries.rs`
- **RED テスト**: `query_walk_returns_events_sorted_by_occurred_at`
- **GREEN**: `WalkOutput.events` 遅延ロード（既存 `dogs`/`points` と同パターン）
- **依存**: T-A5

#### T-M1: 型定義と GraphQL 文字列
- **対象**: `apps/mobile/lib/graphql/mutations.ts`, `queries.ts`, `types/graphql.ts`
- **検証**: `npx tsc --noEmit`
- **依存**: T-A6

#### T-M2: Zustand store 拡張
- **対象**: `apps/mobile/stores/walk-store.ts`, `walk-store.test.ts`
- **RED テスト**: `addEvent appends`, `reset clears events`, `addEvent preserves order`
- **依存**: T-M1

#### T-M3: Hooks `use-walk-event-mutations.ts`
- **対象**: `apps/mobile/hooks/use-walk-event-mutations.ts`（新規）, `.test.ts`
- **RED テスト**: `useRecordWalkEvent`, `useGenerateWalkEventPhotoUploadUrl` の成功/失敗
- **依存**: T-M1

#### T-M4: `WalkEventActions` コンポーネント
- **対象**: `apps/mobile/components/walk/WalkEventActions.tsx`（新規）, `.test.tsx`
- **RED テスト**:
  - pee ボタン → recordWalkEvent 呼び出し（AC-1）
  - poo ボタン → recordWalkEvent（AC-2）
  - GPS 欠損時 lat/lng undefined 送信（AC-7）
  - エラー時 Alert + store ロールバック
  - photo フロー（カメラモック → 選択的アップロード → event 記録）（AC-3）
  - dog_id 決定: 単頭 → dog_id set, 複数頭 → null
  - 成功時 addEvent 呼び出し（楽観的更新）
- **依存**: T-M2, T-M3

#### T-M5: `WalkEventTimeline` コンポーネント（T-M4 と並列可）
- **対象**: `apps/mobile/components/walk/WalkEventTimeline.tsx`（新規）, `.test.tsx`
- **RED テスト**: 3 イベント種、formatClockTime、空状態、写真タップでフルスクリーンモーダル（AC-5）
- **依存**: T-M1

#### T-M6: `WalkMap` 拡張
- **対象**: `apps/mobile/components/walk/WalkMap.tsx`, `.test.tsx`
- **RED テスト**: Marker per event、GPS欠損 event はスキップ、emoji アイコン
- **依存**: T-M1

#### T-M7: 画面統合
- **対象**: `apps/mobile/app/(tabs)/walk.tsx`, `apps/mobile/app/walks/[id].tsx`
- **検証**: `npx tsc --noEmit`, `npm test`
- **依存**: T-M4, T-M5, T-M6

#### T-E1: GraphQL API E2E
- **対象**: `apps/e2e/tests/api/walk-events.spec.ts`（新規）
- **シナリオ**: pee/poo 記録、photo 記録（presigned → PUT → recordWalkEvent）、events ソート、権限拒否、GPS 欠損
- **検証**: `docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test --project API tests/api/walk-events.spec.ts`
- **依存**: T-A6

#### T-E2: Mobile UI E2E（pee/poo + 結果画面のみ）
- **対象**: `apps/e2e/tests/mobile/walk-events.spec.ts`（新規）
- **シナリオ**: ダミー犬 → 散歩開始 → pee/poo → 終了 → タイムライン 2 件確認（ja/en 両ロケール）
- **スコープ外（手動）**: AC-3 カメラフロー（iOS Simulator で確認）
- **依存**: T-M7, T-E1

### 実行順序（依存グラフ）

```
T-A1 → T-A2 → T-A3 ┐
                   ├─► T-A5 → T-A6 → T-M1 ─┬─► T-M2 ─┐
T-A4 ──────────────┘                       ├─► T-M3 ─┤
                                           │         ├─► T-M4 ─┐
                                           ├─► T-M5 ─┤         │
                                           └─► T-M6 ─┘         ├─► T-M7 → T-E2
                                                               │
                                    T-A6 → T-E1 ───────────────┘
```

