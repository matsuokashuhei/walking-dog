# Scan: api

対象: `apps/api/src/` および `apps/api/tests/`
日付: 2026-04-14
スキャン基準: DRY/KISS/YAGNI + SOLID + テスト・品質 + 実務マインド

## 課題一覧

### 設計原則 (DRY / KISS / YAGNI)

### [DRY] apps/api/src/graphql/custom_queries.rs:273-320 / custom_queries.rs:419-472
`walk_by_id_field` と `walk_points_field` で walk 認可ロジックが重複。手動で `WalkDogEntity` を取得し、ループで `dog_member_service::require_dog_member` を呼んでいる。同等の処理が `walk_event_service::require_walk_access` に既に存在するが再利用されていない。

### [DRY] apps/api/src/graphql/custom_mutations.rs:1791-1854 / custom_mutations.rs:1886-1918
`record_encounter` と `update_encounter_duration` mutation で同一の walk 所有権検証 (`walk.user_id == user.id`) と `encounter_detection_enabled` チェックロジックが重複。

### [DRY] apps/api/src/graphql/custom_queries.rs:328-349 / custom_mutations.rs:1343-1407
「require_auth → get_or_create_user → require_dog_member」の3行認可パターンが mutation/query 間で約18箇所に繰り返される。

### [DRY] apps/api/src/services/user_service.rs:6-40 / user_service.rs:43-81
`get_or_create_user` と `create_user_with_profile` が同一の upsert ロジック (find → insert → duplicate key 判定 → refetch) を持つ。

### [DRY] apps/api/src/graphql/custom_mutations.rs:1353-1386 / custom_mutations.rs:1308-1326
`createDog` と `updateDog` で `BirthDate` のパース処理 (year/month/day 抽出 → null判定 → `to_json`) が重複。

### [DRY] apps/api/src/services/encounter_service.rs 全体
`record_encounter` と `update_encounter_duration` で dog pair 正規化 (`if my_dog < their_dog`) が両関数にコピーされている。

### [KISS] apps/api/src/graphql/custom_mutations.rs:1825-1854
`record_encounter_field` 内の三重ネストループ (dog → members → user fetch) が N+M クエリを発生させる。JOIN または一括取得で済む処理を手動ループで書いている。

### [YAGNI] apps/api/src/services/encounter_service.rs:108-163
`update_encounter_duration` がどこからも呼ばれていない (mutations/queries に grep ヒット無し)。dead code。

---

### SOLID

### [SRP] apps/api/src/graphql/custom_mutations.rs:1776-1874
`record_encounter_field` が認証・ユーザーロード・6エンティティ跨ぎの権限検証・encounter 記録・出力変換を1クロージャに混在。

### [SRP] apps/api/src/graphql/custom_mutations.rs:1472-1531
`add_walk_points_field` が GraphQL 入力パース・認証・walk 所有権検証・サービス呼び出しを同一ハンドラで処理。

### [SRP] apps/api/src/graphql/custom_mutations.rs:1588-1630
`generate_dog_photo_upload_url_field` が認証・ユーザーロード・dog_member 権限検証・S3 presigned URL 生成を1クロージャで実行。

### [SRP] apps/api/src/graphql/custom_mutations.rs:1152-1185
`sign_up_field` が Cognito sign_up と DB ユーザープロファイル作成 (`create_user_with_profile`) を同一ハンドラで実行。認証と DB 責務が混在。

### [OCP] apps/api/src/graphql/custom_mutations.rs:1776-1942
`encounter_detection_enabled` フラグ検証や権限検証ロジックが複数クロージャに散在。検証ルール追加時に全箇所を修正する必要がある。

### [DIP] apps/api/src/lib.rs:20-26
`AppState` が `aws_sdk_dynamodb::Client`, `aws_sdk_s3::Client`, `aws_sdk_cognitoidentityprovider::Client` を具体型で保持。trait 抽象化が無いためテストでモック差し替え不可。

### [DIP] apps/api/src/services/s3_service.rs:27-57, 60-90
`generate_walk_event_photo_upload_url` と `generate_dog_photo_upload_url` が `aws_sdk_s3::Client` を直接受け取る。

### [DIP] apps/api/src/services/walk_points_service.rs:22-96
`add_walk_points` と `get_walk_points` が `aws_sdk_dynamodb::Client` を直接受け取る。

### [DIP] apps/api/src/auth/service.rs 全体
`sign_up`, `sign_in`, `confirm_sign_up`, `refresh_token`, `sign_out` が `aws_sdk_cognitoidentityprovider::Client` を直接受け取る。Cognito を差し替え可能にする抽象無し。

### [DIP] apps/api/src/services/*_service.rs 全体
全サービス関数が `sea_orm::DatabaseConnection` を直接受け取り、リポジトリ trait を経由していない。

---

### テスト・品質

### [Testability] apps/api/src/services/ 全体 / apps/api/tests/
全11テストファイルがGraphQL経由の統合テストで、サービス層のユニットテストが無い。DB/S3/DynamoDB/Cognito が起動していないと実行不可、フィードバックループが遅い。

### [Testability] apps/api/tests/common/mod.rs:10-24, 75-84
`TestClient` のメソッドと `UserToken` 定数に `#[allow(dead_code)]` が散在。実際は使われているが属性で警告を黙らせている。

### [Testability] apps/api/src/graphql/custom_mutations.rs:1414-1436, 1498-1512
GraphQL resolver で `?` 演算子をチェーン。1フィールドのパース失敗で全体失敗となり、クライアントにどのフィールドが不正か伝わらない。

### [SoC] apps/api/src/graphql/custom_mutations.rs 全体
2000行超えの単一ファイルに mutation resolver が集約、GraphQL 層とビジネスロジックが未分離。

### [SideEffect] apps/api/src/services/ 全体
DB 書き込み・S3 操作・DynamoDB 書き込みがサービス関数内に分散。純粋関数 (バリデーション・変換) とI/Oの分離が無い。

---

### 実務マインド

### [Readability] apps/api/src/services/walk_service.rs:92-94
期間マッピングが `"Week" => weeks(1)`, `"Month" => days(30)`, `"Year" => days(365)` と文字列→期間の対応を関数内に埋め込み。定数化されていない。

### [Readability] apps/api/src/services/walk_service.rs:33, 65, 76, 108
Walk status の `"active"` / `"finished"` が文字列リテラルで散在。定数 / enum 化されていない。

### [Readability] apps/api/src/services/s3_service.rs:37, 51, 70, 84
S3 presigned URL の有効期限 `3600` がハードコード、2関数で重複。

### [Readability] apps/api/src/services/walk_points_service.rs:28, 54
DynamoDB バッチ書き込み上限 `25` がリテラルで直接記述、コメントのみで定数無し。

### [Readability] apps/api/src/services/dog_invitation_service.rs:21-22
招待有効期限 `Duration::hours(24)` がハードコード。期限定数が複数サービスに散在、一元管理無し。

### [Readability] apps/api/src/graphql/custom_queries.rs:140
フィールド名 camelCase/snake_case の混在。GraphQL 命名規則と Rust 命名規則の変換ポリシーが明示されていない。

### [CodeSmell] apps/api/src/services/user_service.rs:29-30, 67-68
`err.to_string().contains("duplicate key")` で DB エラー文字列マッチ。SeaORM のエラーバリアント型ベース判定を使っていない、脆い。

### [CodeSmell] apps/api/src/auth/service.rs:14-30
`map_cognito_error` が `err.to_string().contains()` で Cognito エラーを文字列判定。SDK のエラー型を使っていない。

### [CodeSmell] apps/api/src/services/walk_event_service.rs:77
イベントタイプ判定が `["pee", "poo", "photo"].contains(&...)` のインラインスライス。定数配列 or enum 化されていない。

### [PrematureOpt] apps/api/src/graphql/custom_mutations.rs:12
`Arc` と `state.clone()` が 75 回繰り返される。計測根拠のない並列前提の設計か要確認。

### [TechDebt] apps/api/src/auth/mod.rs:30-32, 86, 113-114
`TEST_MODE: JWT検証をスキップ`, `cognito-local does not implement...` 等の but/why コメントが多数。運用上の抜け道がコード側に露出。

---

## 概況

- 最大の負債: **GraphQL resolver が 2000行超え + SRP違反多数** (custom_mutations.rs)
- DIP: **外部依存 (AWS SDK, DB) の具体型直受け** → ユニットテスト不可が全体に波及
- 重複パターン: **認可3行イディオム** が全 resolver に散在 → ヘルパ化で数百行削減可能
- dead code: `encounter_service::update_encounter_duration` 要削除確認

次フェーズ (Phase 2 Solutions) で各課題の解決策を調査する。
