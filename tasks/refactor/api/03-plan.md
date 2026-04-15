# Plan: api refactor

対象: `apps/api/src/` および `apps/api/tests/`
日付: 2026-04-14
入力: `01-scan.md` (課題34件), `02-solutions.md` (採用案/集約パターン6)
優先度基準: `(impact × ease) / risk`

各 Phase は **1セッションで完結する粒度**。先頭から順に実行することで依存関係が解決される。方針は 02-solutions.md の「集約パターン 6つ」に沿う。

## 全 Phase 共通の完了ゲート (2026-04-15 追加 — `tasks/lessons.md` 参照)

production code を変更する Phase は、以下を **すべて** 満たして初めて完了:

1. **lib unit test 緑** (`cargo test --lib`)
2. **影響 integration test 緑** — 変更した production path を踏むテストを少なくとも1本走らせて緑を確認 (例: user_service 変更 → `test_user` + `test_authorization`、auth 変更 → `test_authorization`、graphql resolver 変更 → 該当 mutation/query を呼ぶテスト)
3. **`include_str!` 静的検査だけでの合格判定は禁止** — 必ず runtime 検証とセット
4. **「pre-existing failure」と判定する前に証拠取得** — 変更直前のコミット (`HEAD^` 等) で同テストを実行して比較

完了報告には対応 integration test 名と結果を含めること。

---

## Phase 1: 定数化 (Magic literals → const) — 優先度: 最高

- **対象課題**: [Readability] s3_service.rs `3600` / walk_points_service.rs `25` / dog_invitation_service.rs `Duration::hours(24)`
- **変更**:
  - `apps/api/src/services/s3_service.rs` 先頭に `const S3_PRESIGNED_URL_EXPIRY: Duration = Duration::from_secs(3600);` 追加、2箇所置換
  - `apps/api/src/services/walk_points_service.rs` 先頭に `const DYNAMODB_BATCH_WRITE_LIMIT: usize = 25;` 追加、2箇所置換 (AWS doc URL コメント併記)
  - `apps/api/src/services/dog_invitation_service.rs` 先頭に `const INVITATION_EXPIRY: Duration = Duration::hours(24);` 追加、置換
- **完了条件**:
  - `cargo build` 成功
  - `grep -E '3600|\.hours\(24\)|\b25\b' apps/api/src/services/{s3_service,walk_points_service,dog_invitation_service}.rs` ヒット 0 (定義行除く)
  - 既存統合テスト緑
- **依存**: なし
- **検証**: `docker compose -f apps/compose.yml run --rm api cargo test`
- **推定規模**: S (15分)

---

## Phase 2: enum 化 (WalkStatus / WalkEventType / Period) — 優先度: 高

- **対象課題**: [Readability] walk_service.rs:33,65,76,108 / walk_service.rs:92-94 / [CodeSmell] walk_event_service.rs:77
- **変更**:
  - `apps/api/src/entities/walks.rs` (or 隣接 `walk_status.rs`) に SeaORM `DeriveActiveEnum` で `WalkStatus { Active, Finished }` 定義
  - `apps/api/src/services/walk_event_service.rs` の event_type 検証を `enum WalkEventType { Pee, Poo, Photo }` + `FromStr` に置換、GraphQL enum として登録
  - `apps/api/src/services/walk_service.rs` の Period 文字列 → `enum Period { Week, Month, Year }` + `fn duration(&self) -> Duration`、GraphQL enum 兼用
  - DB マイグレーション: 既存 column が `varchar` で値が `active`/`finished` 等であれば `DeriveActiveEnum(rs_type="String")` で互換維持 (column 型変更なし)
- **完了条件**:
  - 文字列リテラル `"active"` `"finished"` `"pee"` `"poo"` `"photo"` `"Week"` `"Month"` `"Year"` がサービス層から消滅
  - GraphQL schema dump で enum 型が見える
  - 既存テスト緑
- **依存**: Phase 1
- **検証**: `cargo test` + GraphQL introspection クエリ手動確認
- **参照**: https://www.sea-ql.org/SeaORM/docs/generate-entity/enumeration/
- **推定規模**: M (1-2h)

---

## Phase 3: 純粋関数抽出 (dog_pair / birth_date) — 優先度: 高

- **対象課題**: [DRY] encounter_service.rs dog pair / [DRY] custom_mutations.rs BirthDate parse
- **変更**:
  - `apps/api/src/services/encounter_service.rs` に private `fn normalize_dog_pair(a: Uuid, b: Uuid) -> Option<(Uuid, Uuid)>` 追加 (同一なら `None`)、両箇所で使用
  - `apps/api/src/graphql/input/birth_date.rs` (新規) に `pub fn parse_birth_date_input(obj) -> Result<Option<serde_json::Value>, AppError>` 追加、`createDog` / `updateDog` 両 resolver で使用
- **完了条件**:
  - encounter_service の `if my_dog < their_dog` 2箇所が helper 呼び出しに置換
  - custom_mutations の BirthDate parse 30行×2 → 5行×2 に縮小
- **依存**: なし (Phase 2 と並列可)
- **検証**: `cargo test` (encounter / dog 系統合テスト含む)
- **推定規模**: S (30分)

---

## Phase 4: user_service upsert 統合 + duplicate key 文字列判定撲滅 — 優先度: 高

- **対象課題**: [DRY] user_service.rs:6-40/43-81 + [CodeSmell] user_service.rs:29-30,67-68
  - **集約パターン 3** (02-solutions.md)
- **変更**:
  - `user_service.rs` に内部 `async fn upsert_user(db, sub, display_name: Option<&str>) -> Result<UserModel, AppError>` 新設
  - SeaORM `Insert::on_conflict(OnConflict::column(CognitoSub).do_nothing().to_owned())` を採用
  - `TryInsertResult::Conflicted` の場合は `find_by_cognito_sub` で再取得
  - `get_or_create_user` / `create_user_with_profile` を `upsert_user` 呼び出しに置換
  - `err.to_string().contains("duplicate key")` 分岐完全撤去
- **完了条件**:
  - `grep 'duplicate key' apps/api/src/services/user_service.rs` ヒット 0
  - 並列 sign_up シナリオでも競合エラーが発生しない (結合テストで確認可能なら追加)
  - `cargo test --test users` 緑
- **依存**: なし
- **検証**: `docker compose -f apps/compose.yml run --rm api cargo test users`
- **参照**: https://www.sea-ql.org/SeaORM/docs/basic-crud/insert/
- **推定規模**: S (45分)

---

## Phase 5: Cognito エラー `ProvideErrorMetadata::code()` 化 + smithy mocks 単体テスト — 優先度: 中-高

- **対象課題**: [CodeSmell] auth/service.rs:14-30
  - **集約パターン 6** (CodeSmell + Testability 同時解消)
- **変更**:
  - `auth/service.rs` の `map_cognito_error` を `fn map_cognito_error<E: ProvideErrorMetadata>(err: &SdkError<E>) -> AppError` に置換
  - `err.code()` で `Some("UsernameExistsException")` `Some("NotAuthorizedException")` 等を判定
  - `format!("{:?}", e)` による文字列化を除去
  - `Cargo.toml` に `aws-smithy-mocks-experimental` を dev-dependency 追加
  - `auth/service.rs` に `#[cfg(test)] mod tests` を追加、各エラーコードのマッピング unit test を3本以上記述
- **完了条件**:
  - `format!("{:?}"` が auth/service.rs から消滅
  - Cognito エラーコード → AppError マッピングの unit test が緑
  - 既存 sign_up / sign_in / confirm_sign_up 統合テスト緑
- **依存**: なし
- **検証**: `cargo test --lib auth` + 既存統合テスト
- **参照**: https://docs.rs/aws-smithy-types/latest/aws_smithy_types/error/metadata/trait.ProvideErrorMetadata.html 、https://crates.io/crates/aws-smithy-mocks-experimental
- **推定規模**: M (1h)

---

## Phase 6: walk_event_service を認可ハブ化 + auth_helpers 導入 — 優先度: 最高 (impact 最大)

- **対象課題**: [DRY] walk 認可重複 / [DRY] 認可3行イディオム18箇所 / [SRP] generate_dog_photo_upload_url_field
  - **集約パターン 1 + 2** (02-solutions.md)
- **変更**:
  - `apps/api/src/graphql/auth_helpers.rs` 新規
    - `pub async fn resolve_user(ctx, state) -> Result<UserModel, AppError>` (require_auth + get_or_create_user)
    - `pub async fn resolve_user_and_dog(ctx, state, dog_id) -> Result<(UserModel, DogMemberModel), AppError>` (+ require_dog_member)
    - `pub async fn resolve_user_and_walk(ctx, state, walk_id) -> Result<UserModel, AppError>` (+ `walk_event_service::require_walk_access`)
  - `custom_queries::walk_by_id_field` / `walk_points_field` を `resolve_user_and_walk` 経由に統一
  - 認可3行イディオム18箇所を順次 `resolve_user_and_dog` に置換
  - `generate_dog_photo_upload_url_field` を resolver thin 化
- **完了条件**:
  - `grep -A2 require_auth apps/api/src/graphql | grep -c get_or_create_user` が 3 以下 (helper 内部のみ)
  - 全統合テスト緑
- **依存**: Phase 4 (upsert_user 利用)
- **検証**: `cargo test`
- **推定規模**: M (2h)

---

## Phase 7: encounter_service 責務集約 + verify_encounter_detection 新設 — 優先度: 高

- **対象課題**: [DRY/SRP/OCP] encounter mutation 重複 / [SRP] record_encounter_field / [OCP] encounter_detection_enabled 散在
  - **集約パターン 1** (02-solutions.md) — walk_event_service を認可ハブに
- **変更**:
  - `walk_event_service.rs` に `pub async fn verify_encounter_detection(db, walk_id, user_id) -> Result<(), AppError>` 新設
    - walk 取得 + `user_id` 所有権検証 + `encounter_detection_enabled` 検証を 1関数に集約
  - `encounter_service::record_encounter` / `update_encounter_duration` シグネチャに `acting_user_id: Uuid` を追加、内部で `verify_encounter_detection` 呼び出し
  - `custom_mutations::record_encounter_field` / `update_encounter_duration_field` を「入力parse → resolve_user → encounter_service.xxx → 出力変換」の3段に縮小
- **完了条件**:
  - resolver クロージャが各 30 行以下
  - `encounter_detection_enabled` の検証ロジックが service 層 1箇所のみ
  - 既存 encounter テスト緑
- **依存**: Phase 6 (resolve_user 利用)
- **検証**: `cargo test --test encounter`
- **推定規模**: M (1.5h)

---

## Phase 8: encounter N+M クエリ解消 (verify_encounter_detection 内で JOIN 一括取得) — 優先度: 中

- **対象課題**: [KISS] custom_mutations.rs:1825-1854 三重ネストループ
- **変更**:
  - Phase 7 で新設した `walk_event_service::verify_encounter_detection` を拡張し、相手 walk 側の `encounter_detection_enabled` チェックも内包
  - 実装は SeaORM `JoinType::InnerJoin` + `is_in([dog_ids])` で walk_dogs → dog_members → users を 1-2クエリに削減
  - resolver 内の三重ネストループ (dog → members → user fetch) 完全削除
- **完了条件**:
  - 発行 SQL クエリ数が dog 頭数に依存しない (結合/IN で固定2-3)
  - ローカルで `sql_log` を有効化し、dog 3頭で encounter 記録して手動でクエリ数確認
  - 既存テスト緑
- **依存**: Phase 7
- **検証**: `cargo test` + `RUST_LOG=sea_orm=debug cargo run` で SQL ログ目視
- **参照**: https://www.sea-ql.org/SeaORM/docs/advanced-query/advanced-joins/
- **推定規模**: M (1h)

---

## Phase 9: GraphQL field-wise バリデーションエラー — 優先度: 中

- **対象課題**: [Testability] custom_mutations.rs:1414-1436/1498-1512 `?` チェーン 1フィールド失敗
- **変更**:
  - `apps/api/src/error.rs` に `AppError::ValidationErrors(Vec<FieldError>)` バリアント追加
  - `struct FieldError { field: String, message: String }` 新規定義
  - `into_graphql_error` で `extensions.fields = [{field, message}, ...]` を返す
  - `add_walk_points_field`, `record_encounter_field` の `?` チェーンを `errors.push(...)` 蓄積方式に変換
- **完了条件**:
  - 3フィールド全不正の入力で response の `extensions.fields.len() == 3`
  - テスト追加 (E2E で field 別エラー検証)
  - 既存テスト緑
- **依存**: なし (他 Phase と並列可)
- **検証**: `cargo test`
- **推定規模**: M (1.5h)

---

## Phase 10: TEST_MODE → `trait JwtVerifier` 抽象化 — 優先度: 中

- **対象課題**: [TechDebt] auth/mod.rs:30-32,86,113-114 TEST_MODE/cognito-local コメント
- **変更**:
  - `apps/api/src/auth/jwt.rs` (新規) に `trait JwtVerifier { async fn verify(&self, token: &str) -> Result<Claims, AppError>; }` 定義
  - 本物実装 `CognitoJwtVerifier` と test 用 `NoOpJwtVerifier` (sub をそのまま claim にする) を実装
  - `AppState` に `verifier: Arc<dyn JwtVerifier + Send + Sync>` 追加
  - middleware から `TEST_MODE` env 分岐を削除
  - test ハーネスで `NoOpJwtVerifier` を注入
  - 運用メモ (cognito-local の制約) は `apps/api/CLAUDE.md` へ移譲
- **完了条件**:
  - production binary に `TEST_MODE` 分岐が残っていない
  - `cargo build --release && strings target/release/api | grep -i test_mode` ヒット 0
  - 既存統合テスト緑 (NoOp 注入で動作)
- **依存**: なし
- **検証**: `cargo build --release` + 統合テスト一式
- **推定規模**: M (1.5-2h)

---

## Phase 11: テスト基盤整備 (`tests/support/` 分離 + `MockDatabase` 導入) — 優先度: 中

- **対象課題**: [Testability] tests/common/mod.rs `#[allow(dead_code)]`, [Testability] サービス層ユニットテスト不足
  - **集約パターン 5** (02-solutions.md)
- **変更**:
  - `apps/api/tests/common/mod.rs` を `apps/api/tests/support/{mod.rs,client.rs,fixtures.rs,tokens.rs}` に分割
  - 各 integration test crate が必要な module だけ `mod support;` で取り込む構造に
  - `#[allow(dead_code)]` 撤去
  - `apps/api/src/services/encounter_service.rs` / `walk_service.rs` に `#[cfg(test)] mod tests` を追加、`sea_orm::MockDatabase` で unit test を各 3件以上追加
  - 既存 integration test はそのまま保持
- **完了条件**:
  - `grep -r '#\[allow(dead_code)\]' apps/api/tests` ヒット 0
  - `cargo test --lib` でサービス層単体テストが 6件以上実行される
  - 既存 integration テスト緑
- **依存**: Phase 3, Phase 7
- **検証**: `cargo test --lib && cargo test --tests`
- **参照**: https://www.sea-ql.org/SeaORM/docs/write-test/mock/
- **推定規模**: M (2h)

---

## Phase 12: sign_up facade 化 — 優先度: 中

- **対象課題**: [SRP] custom_mutations.rs:1152-1185
  - **採用解 B** (02-solutions.md) — 仕様変更なしの facade 化 (D案は保留)
- **変更**:
  - `apps/api/src/auth/service.rs` に `pub async fn sign_up_with_profile(cognito, client_id, db, email, password, display_name) -> Result<SignUpResult, AppError>` 追加
    - 内部で Cognito `sign_up` → `user_service::upsert_user(db, &sub, Some(display_name))`
    - `user_sub` 空チェックで既存挙動維持
  - `custom_mutations::sign_up_field` を「入力parse → facade → 出力変換」の3段に縮小
  - `user_service::create_user_with_profile` は未使用化されたら削除
- **完了条件**:
  - `sign_up_field` 本体 20行以下
  - `auth::service::sign_up_with_profile` 経由で DB profile 作成される (display_name 付き)
  - 既存 auth テスト緑
- **依存**: Phase 4 (upsert_user 利用)
- **検証**: `docker compose -f apps/compose.yml run --rm api cargo test --test auth`
- **推定規模**: S (30分)

---

## Phase 13: custom_mutations.rs ファイル分割 — 優先度: 低 (最後)

- **対象課題**: [SoC] custom_mutations.rs 2000行超
  - **集約パターン 2 の後半** — resolver thin 化が先
- **変更**:
  - `apps/api/src/graphql/mutations/{auth,dog,walk,encounter,photo}.rs` に分割
  - 各ファイル ~300-400行
  - `apps/api/src/graphql/mutations/mod.rs` で `Field` を集約
- **完了条件**:
  - `custom_mutations.rs` 削除 or aggregator のみ
  - 各ファイル 500行以下
  - 全テスト緑
- **依存**: **Phase 6, 7, 8, 9, 10, 12 完了後** (resolver thin 化済)
- **検証**: `cargo test && cargo build --release`
- **推定規模**: M (2h、機械的だが import / 公開範囲整理が発生)

---

## 不採用 (Phase 3 で扱わない)

- **AWS SDK (S3/Dynamo/Cognito) と DB の trait 抽象化** — YAGNI、変更コスト >> 利益。代替は LocalStack + cognito-local + SeaORM `MockDatabase` + `aws-smithy-mocks-experimental`
- **Arc clone 削減** — 計測根拠なし、`Arc::clone` は atomic inc のみ
- **`update_encounter_duration` 削除** — scan の dead code 判定は誤り (`custom_mutations.rs:1920` から呼び出し済み)
- **`Config` 経由 TTL 注入** — 環境別に変える要件なし、定数で十分
- **sign_up D案 (初回ログイン時 DB 作成)** — 仕様変更を含むためユーザー承認待ち、B (facade) を採用

---

## Phase ↔ 必須 integration test (完了ゲート)

各 Phase 完了時に下記テストを `cargo test --test <name> -- --test-threads=1` で実行し緑確認:

| Phase | 影響領域 | 必須 integration test |
|---|---|---|
| 6 | walk_event_service / auth_helpers / 全 resolver | `test_authorization`, `test_walk`, `test_dog`, `test_dog_member` |
| 7 | encounter_service | `test_encounter`, `test_encounter_flow` |
| 8 | encounter (N+M クエリ) | `test_encounter`, `test_encounter_flow` (+ SQL ログ手動確認) |
| 9 | error.rs / バリデーション resolver | `test_walk` (add_walk_points), `test_encounter` (+ field-wise エラー検証 1本新規) |
| 10 | auth/mod.rs JWT verifier | `test_authorization`, `test_user` (test ハーネスで NoOp 注入動作確認) |
| 11 | tests/support/ + 各 service unit test | 全 integration test (`cargo test --tests`) — 構造変更後の崩れ検知 |
| 12 | auth/service / sign_up | `test_user`, `test_sharing_flow` (sign_up 呼び出しがあれば) |
| 13 | custom_mutations.rs ファイル分割 | 全 integration test (`cargo test --tests`) — 機械的だが import 漏れ検知必須 |

## 集約パターンと Phase の対応 (02-solutions.md 参照)

| パターン | 対応 Phase |
|---|---|
| 1. walk_event_service を認可ハブに | Phase 6, 7, 8 |
| 2. require_auth_and_member util + 分割 | Phase 6, 13 |
| 3. SeaORM `on_conflict()` | Phase 4 |
| 4. 定数/enum 一括 | Phase 1, 2 |
| 5. テスト基盤整備 | Phase 11 |
| 6. Cognito エラー `code()` + smithy mocks | Phase 5 |

---

## 実行手順 (Phase 4 — 各セッション)

各 Phase ごとに **新しい Claude セッション** を起動し、以下のテンプレで指示する:

```
tasks/refactor/api/03-plan.md の Phase <N> を実行して。
TDD で進める (superpowers:test-driven-development)。
完了したら progress.md の Phase <N> を完了に更新して。
```

### 依存グラフ

```
1 → 2 (enum のうち Period は 1 の const 整理と整合)
3 (独立、1-2 と並列可)
4 (独立)
5 (独立)
6 depends on 4
7 depends on 6
8 depends on 7
9 (独立、並列可)
10 (独立、並列可)
11 depends on 3, 7
12 depends on 4
13 depends on 6, 7, 8, 9, 10, 12 (最後)
```

推奨順: **1 → 2 → 3/4/5/9/10 並列 → 6 → 7 → 8 → 11 → 12 → 13**

`progress.md` に各 Phase の完了状況・日付・コミットハッシュ・残課題を記録すること。
