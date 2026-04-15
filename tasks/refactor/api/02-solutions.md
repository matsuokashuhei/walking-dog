# Solutions: api

対象: `apps/api/src/` および `apps/api/tests/`
日付: 2026-04-14
入力: `tasks/refactor/api/01-scan.md`

各課題に **候補 → 採用 → 理由 → 参照** を記録する。採用案は KISS / YAGNI / 既存コード再利用 を優先。

---

## 設計原則 (DRY / KISS / YAGNI)

### [DRY] custom_queries.rs:273-320 / :419-472 walk 認可重複

**候補**
- A: `walk_event_service::require_walk_access` を両 resolver で呼ぶ (既存関数再利用)
- B: `async_graphql` の Guard trait を実装し `#[graphql(guard = ...)]` で宣言的適用

**採用**: A

**理由**: 既存関数があり YAGNI。async-graphql の dynamic API は Guard マクロを直接サポートしない。KISS。

**参照**: `apps/api/src/services/walk_event_service.rs:30-62`

---

### [DRY] custom_mutations.rs:1791-1854 / :1886-1918 encounter 認可重複

**候補**
- A: `walk_event_service::verify_encounter_detection(db, walk_id, user_id)` を新設、両 mutation で呼ぶ
- B: `user_service` に `verify_encounter_detection_enabled` を追加

**採用**: A

**理由**: walk 権限の集約点が既に `walk_event_service`。同サービスに encounter 検証も置くほうが SRP / SoC 整合。

---

### [DRY] 認可3行イディオム (18箇所散在)

**候補**
- A: util 関数 `require_auth_and_member(ctx, dog_id) -> Result<User>` を新設、明示呼び出し
- B: async-graphql dynamic context extractor 実装
- C: DataLoader 導入してバッチ化

**採用**: A

**理由**: dynamic API では extractor 機能が限定的。明示的 utility は呼び出し点が全て見え、テスト・デバッグ容易。DataLoader は現構造に対し過剰設計 (YAGNI)。

---

### [DRY] user_service.rs:6-40 / :43-81 upsert 重複

**候補**
- A: 共通 `upsert_user(db, cognito_sub, display_name?) -> Result<User>` に統合
- B: DB レベル UPSERT (`ON CONFLICT DO NOTHING/UPDATE`) を SeaORM 0.12+ `on_conflict()` で記述

**採用**: B

**理由**: `err.to_string().contains("duplicate key")` による retry は脆い (DB 依存文字列)。`on_conflict().do_nothing()` はアトミックで race condition 無し、再取得不要。`[CodeSmell] user_service.rs:29-30, 67-68` も同時解決。

**参照**: https://www.sea-ql.org/SeaORM/docs/basic-crud/insert/

---

### [DRY] custom_mutations.rs:1353-1386 / :1308-1326 BirthDate パース重複

**候補**
- A: `parse_birth_date_input(obj) -> Result<Option<serde_json::Value>>` util に抽出
- B: async-graphql の `InputObject` マクロで型安全スキーマ化

**採用**: A

**理由**: dynamic API は `InputObject` マクロ非対応。関数抽出で 15 行の重複が消える、KISS。

---

### [DRY] encounter_service.rs dog pair 正規化

**候補**
- A: public util `normalize_dog_pair(a, b) -> (Uuid, Uuid)` を新設
- B: encounter_service 内に private helper `normalize_pair` を定義

**採用**: B

**理由**: モジュール内部の concern。public export 不要 (ISG / 情報隠蔽)。

---

### [KISS] custom_mutations.rs:1825-1854 encounter N+M クエリ

**候補**
- A: resolver 内で batch query (is_in) に書き換え
- B: `walk_event_service::verify_encounter_detection` に集約、SeaORM JoinType で一括取得

**採用**: B

**理由**: resolver 層に batch logic を置くのは SRP 違反。service 層に push すれば resolver は thin。`dog_member_service::get_members_by_dog` に bulk pattern 既存あり再利用可。

**参照**: `apps/api/src/services/dog_member_service.rs:53-77`、https://www.sea-ql.org/SeaORM/docs/advanced-query/advanced-joins/

---

### [YAGNI] encounter_service.rs:108-163 update_encounter_duration

**候補**
- A: 削除
- B: 保持

**採用**: B (**Phase 1 誤判定を訂正**)

**理由**: 再 grep で `custom_mutations.rs` から呼び出し確認済み。Phase 1 スキャン時の grep 漏れ。dead code ではないので **この課題は Phase 3 計画に含めない**。

---

## SOLID

### [SRP] custom_mutations.rs:1776-1874 record_encounter_field 混在

**候補**
- A: 新 service `encounter_service::create_encounter_verified(db, my_walk, their_walk, duration, user_id)` に認証後処理を集約
- B: resolver 内で 3 段階 (auth → service → format) に分割

**採用**: A

**理由**: walk 所有権 + encounter 検出フラグ + 記録を single business operation として service 化。resolver は thin (auth → call → format)。

---

### [SRP] custom_mutations.rs:1472-1531 add_walk_points_field 混在

**候補**
- A: parse は resolver、auth は util (`require_auth_and_walk_owner`)、業務は `walk_points_service`。責務分離
- B: `AddWalkPointsInput` struct を定義、専用 parser 関数分離

**採用**: A

**理由**: 標準 GraphQL layered pattern。B の parser 層は micro-abstraction (YAGNI)。

---

### [SRP] custom_mutations.rs:1588-1630 generate_dog_photo_upload_url_field 混在

**候補**
- A: resolver は thin wrapper (auth → existing util)
- B: `s3_service::generate_dog_photo_presigned_url_verified(db, s3, dog_id, user_id, content_type)` に dog_member check を集約

**採用**: B

**理由**: photo upload authorization + URL 生成は single concern。service に隠蔽で resolver 極簡。dog_member check を切り離すのは逆に凝集度を下げる。

---

### [SRP] custom_mutations.rs:1152-1185 sign_up_field 混在

**候補**
- A: resolver が Cognito と user_service を順に呼ぶ (現状維持、ただし user 作成部を明示関数化)
- B: 新 `user_service::complete_sign_up(db, cognito_sub, display_name)` で DB 側責務を閉じ込める

**採用**: B

**理由**: Cognito (external auth) と DB ユーザー作成は分離可能な責務。service 側を厚くすれば resolver は orchestration のみ。

---

### [OCP] custom_mutations.rs:1776-1942 encounter_detection 検証散在

**候補**
- A: `walk_event_service::verify_users_allow_encounter_detection(db, user_id, walk_id)` に集約
- B: user モデルに method 追加、resolver で明示列挙

**採用**: A

**理由**: 新規制約 (例: per-day 制限) 追加時、service 一点のみ変更。呼び出し側は stable。DRY 案と同じ集約点になり一石二鳥。

---

### [DIP] lib.rs:20-26 AppState 具体型保持

**候補**
- A: 全 SDK クライアントを trait wrap (S3Repository, DynamoRepository, CognitoRepository)
- B: 具体型のまま、テストは LocalStack + cognito-local で統合テスト拡充
- C: ジェネリック化 (`AppState<F: Fn(...)>`)

**採用**: B

**理由**: AWS SDK trait 化は method 数 × 3 クライアントで boilerplate 膨張。既に cognito-local / LocalStack 前提の環境。統合テスト拡充のほうが ROI 高。YAGNI。

**参照**: https://docs.localstack.cloud/aws/integrations/testing/testcontainers/

---

### [DIP] s3_service.rs DIP

**候補**
- A: `S3ClientTrait` で wrap
- B: 純粋部 (content-type 検証、拡張子決定) と I/O 部を明確分離、I/O は統合テスト

**採用**: B

**理由**: 副作用は presigned URL 生成のみ、残りは pure。pure を unit test、I/O を LocalStack で結合テスト。trait 追加より分離で十分。

---

### [DIP] walk_points_service.rs DIP

**候補**
- A: `DynamoRepository` trait 化
- B: 純粋部 (batch chunk = 25, sort) を分離し unit test、I/O は LocalStack

**採用**: B

**理由**: batch 分割ロジックは pure function 化可能。trait wrap 不要。

---

### [DIP] auth/service.rs DIP

**候補**
- A: `CognitoService` trait 化
- B: cognito-local を前提に結合テスト拡充 + `aws-smithy-mocks-experimental` でホットスポット mock

**採用**: B

**理由**: 既に `TEST_MODE` で local JWT 検証バイパス実装済み、cognito-local 環境整備済み。trait 化は boilerplate。エラーハンドリング検証だけは SDK レベル mock で補える。

**参照**: https://crates.io/crates/aws-smithy-mocks-experimental

---

### [DIP] services/*_service.rs DatabaseConnection 直受け

**候補**
- A: 全サービスに Repository trait (UserRepository, DogRepository, …)
- B: `sea_orm::MockDatabase` を使った unit test 追加、trait 化はしない
- C: `ConnectionTrait` 受けに統一 (既に `dog_member_service` で採用例あり)

**採用**: B + C

**理由**: SeaORM 公式 `MockDatabase` を使えば unit 可能。`ConnectionTrait` 受けはトランザクション注入も可能で低コスト。trait 化は method 50+ で boilerplate 過大 (YAGNI)。

**参照**: https://www.sea-ql.org/SeaORM/docs/write-test/mock/ 、`apps/api/src/services/dog_member_service.rs:14-25`

---

## テスト・品質

### [Testability] services/ + tests/ ユニットテスト無し

**候補**
- A: 各 service に `#[cfg(test)] mod tests` を追加、`MockDatabase` + AWS SDK 結合テスト併用
- B: testcontainers で DB/S3/DynamoDB/Cognito 全立ち上げ、高速化のみ
- C: fake 実装を services/ 内に書く

**採用**: A + B 並行

**理由**: unit (MockDatabase) と integration (testcontainers) を層別に用意。feedback loop 高速化 + end-to-end 検証両立。

**参照**: https://docs.rs/mockall, https://testcontainers.com/modules/localstack/

---

### [Testability] tests/common/mod.rs `#[allow(dead_code)]` 散在

**候補**
- A: 警告属性を消し、実使用/未使用を確認、未使用なら削除
- B: `tests/support/` に分離 (integration test は crate 毎独立のため共通コードが未使用警告になる仕様対応)
- C: clippy.toml 設定

**採用**: B

**理由**: Cargo integration test は各 `tests/*.rs` が独立 crate 扱いとなり、`common/mod.rs` の関数が一部 crate で未使用扱いされる仕様。`tests/support/` に分離 + `mod` 宣言を整理すれば `#[allow]` は構造的に不要になる。

**参照**: https://doc.rust-lang.org/cargo/guide/tests.html

---

### [Testability] GraphQL resolver `?` チェーン

**候補**
- A: `Vec<FieldError { field, message }>` を蓄積し `Err(AppError::ValidationErrors(vec))` 返却
- B: union 返却型 (`Result` or `UserErrors`) で field-wise error
- C: `validator` crate 導入

**採用**: A

**理由**: 最小依存、async-graphql error extension と整合、手書きパース構造に validator crate は恩恵薄 (YAGNI)。

**参照**: https://medium.com/@koistya/validation-and-user-errors-in-graphql-mutations-39ca79cd00bf

---

### [SoC] custom_mutations.rs 2000行超

**候補**
- A: ファイル分割 (`graphql/mutations/{sign_up, walk, dog, encounter, photo}.rs`) + ビジネスロジックは services/ へ push
- B: 認可 3行イディオムを util 関数で 1行化 (上記 DRY 解決と同時)
- C: async-graphql Field builder の module 単位 organization

**採用**: A + B

**理由**: 物理分割だけでは本質改善にならない。B で数百行削減。A + B で file size と凝集度を同時改善。他リファクタ完了後の最後に実施が安全。

---

### [SideEffect] services/ 純粋関数/IO 分離無し

**候補**
- A: functional core + imperative shell pattern。validation/transform は pure、DB/S3/DynamoDB は shell
- B: validate → transform → I/O の3段階に services 内で分離
- C: domain 層新設

**採用**: A + B

**理由**: pure 部は unit test 容易、I/O は統合テスト。Testability と同時解決。domain 層新設は YAGNI。

**参照**: https://functional-architecture.org/functional_core_imperative_shell/

---

## 実務マインド

### [Readability] walk_service.rs:92-94 期間マッピング

**候補**
- A: `enum Period { Week, Month, Year }` + `impl Period { fn duration(&self) -> Duration }` (GraphQL enum と兼用)
- B: const 配列
- C: HashMap (lazy_static/once_cell)

**採用**: A

**理由**: 型安全、panic 余地無し、GraphQL 入力層で即検証可能。KISS。

---

### [Readability] walk_service.rs Walk status "active"/"finished"

**候補**
- A: `enum WalkStatus { Active, Finished }` を SeaORM `DeriveActiveEnum` で DB column と同期
- B: const 文字列

**採用**: A

**理由**: DB カラム文字列 ↔ enum の相互変換を一元管理。`active`/`finished` 以外の値が代入不可になる。

**参照**: https://www.sea-ql.org/SeaORM/docs/generate-entity/enumeration/

---

### [Readability] s3_service.rs 有効期限 3600

**候補**
- A: `const S3_PRESIGNED_URL_EXPIRY_SECS: u64 = 3600;`
- B: `const S3_PRESIGNED_URL_EXPIRY: Duration = Duration::from_secs(3600);`

**採用**: B

**理由**: Duration 型で単位混同防止、呼び出し側の `Duration::from_secs` 不要。

---

### [Readability] walk_points_service.rs 25 batch

**候補**
- A: `const DYNAMODB_BATCH_WRITE_LIMIT: usize = 25;`
- B: enum 化

**採用**: A

**理由**: 単一の AWS SDK constraint。enum は過剰 (KISS)。AWS doc URL をコメント併記。

---

### [Readability] dog_invitation_service.rs 招待期限

**候補**
- A: `const INVITATION_EXPIRY: Duration = Duration::hours(24);`
- B: i64 + 呼び出し側で Duration 構築

**採用**: A

**理由**: Duration 型で直接保持、呼び出し簡潔。

---

### [Readability] camelCase/snake_case GraphQL 変換

**候補**
- A: `fn to_camel_case` helper + CLAUDE.md に規約明記
- B: マクロ化
- C: serde rename 相当

**採用**: A

**理由**: async-graphql dynamic API はマクロ不可。helper + 規約ドキュメントで十分、変更規模最小。

---

### [CodeSmell] user_service.rs duplicate key 文字列マッチ

**候補**
- A: SeaORM `on_conflict().do_nothing()` で `TryInsertResult::Conflicted` を値で判定
- B: `DbErr::Exec` variant パターンマッチ + SQL state code
- C: 独自エラー型

**採用**: A

**理由**: 公式推奨、アトミック、文字列依存消える。`[DRY] user_service.rs 重複` と同時解決。

**参照**: https://www.sea-ql.org/SeaORM/docs/advanced-query/error-handling/

---

### [CodeSmell] auth/service.rs Cognito エラー文字列マッチ

**候補**
- A: `SdkError::ServiceError(e)` → `e.into_service_error()` → 各 operation error variant マッチ
- B: `ProvideErrorMetadata::code()` を使い `err.code() == Some("UsernameExistsException")` で判定
- C: `.source()` で下層エラー検査

**採用**: B

**理由**: A は match 対象のエラー型がオペレーション毎 (`SignUpError`, `InitiateAuthError` 等) で重複増大。`code()` は全 SDK エラー共通の trait method で1関数で完結。文字列は残るが SDK 公式安定 API で脆さ大幅減。

**参照**: https://docs.rs/aws-smithy-types/latest/aws_smithy_types/error/metadata/trait.ProvideErrorMetadata.html

---

### [CodeSmell] walk_event_service.rs イベントタイプ

**候補**
- A: `enum WalkEventType { Pee, Poo, Photo }` + `FromStr` + GraphQL enum
- B: const 配列
- C: strum_enum crate

**採用**: A

**理由**: タイプ追加時に全マッチ箇所がコンパイルエラー化 (OCP)。WalkStatus と同ポリシー。外部依存無し。

---

### [PrematureOpt] custom_mutations.rs Arc + clone 75回

**候補**
- A: 現状維持
- B: state 事前計算で clone 減
- C: Mutex/RwLock 導入

**採用**: A

**理由**: `Arc::clone` は atomic inc のみ、超軽量。計測根拠無し。YAGNI。**Phase 3 計画から除外**。

---

### [TechDebt] auth/mod.rs TEST_MODE コメント

**候補**
- A: `#[cfg(test)]` ブロック分離
- B: `trait JwtVerifier` 抽象化 (本物実装 + test NoOp 実装分離)
- C: コメントを README / CLAUDE.md に移譲

**採用**: B

**理由**: integration test (別 crate) からは `cfg(test)` 不可。trait 抽象化で test ハーネスから NoOp 注入、本番バイナリには本物実装のみリンク。運用理由コメントは C でドキュメント移譲併用。

---

## Phase 3 への引き継ぎメモ

### 集約パターン (複数課題を同時解決)

1. **`walk_event_service` を認可のハブに**
   - `require_walk_access` 既存 → walk_by_id / walk_points 認可で再利用
   - `verify_encounter_detection` 新設 → record/update 両 mutation で再利用 + N+M 回避
   - → DRY ×3 + KISS + SRP + OCP 一括解消

2. **`require_auth_and_member` util 新設 + custom_mutations.rs 分割**
   - 18箇所の 3行イディオムを 1行化
   - 分割と同時実施で custom_mutations.rs サイズ半減以上見込み
   - → DRY + SoC + SRP 同時解消

3. **SeaORM `on_conflict()` 導入**
   - user_service の upsert 重複削除
   - duplicate key 文字列マッチ code smell 解消
   - → DRY + CodeSmell 同時解消

4. **定数/enum 化を一括実施**
   - `constants.rs` 新規 (`S3_PRESIGNED_URL_EXPIRY`, `DYNAMODB_BATCH_WRITE_LIMIT`, `INVITATION_EXPIRY`)
   - `enum Period`, `enum WalkStatus`, `enum WalkEventType` を `domain/` 配下に
   - SeaORM `DeriveActiveEnum` で DB マイグレーション検討
   - → Readability + CodeSmell 複数同時解消

5. **テスト基盤整備**
   - SeaORM `MockDatabase` で service unit test 雛形
   - testcontainers + LocalStack/cognito-local で結合テスト高速化
   - `tests/support/` に分離し `#[allow(dead_code)]` 消去
   - → Testability + DIP 補強

6. **Cognito エラー `ProvideErrorMetadata::code()` 化**
   - 文字列 `contains` 消去、SDK 公式 API へ
   - 併せて `aws-smithy-mocks-experimental` でエラー経路 unit test 追加
   - → CodeSmell + Testability 同時解消

### 方針

- **trait 抽象化は採用しない** (AWS SDK, DB とも)。LocalStack + cognito-local + MockDatabase + `aws-smithy-mocks-experimental` 路線。
- **dead code `update_encounter_duration`**: Phase 1 誤判定、Phase 3 計画には含めない。
- **`Arc::clone` 最適化**: 計測根拠無しなので扱わない。
- **`sign_up` の D案 (初回ログイン時 DB 作成)**: 仕様変更含むためユーザー承認待ち、保留。フォールバックは B (facade 関数化)。
- 各課題の変更規模と優先度は Phase 3 で `(impact × ease) / risk` で並べる。
- SeaORM `DeriveActiveEnum` 移行は DB マイグレーション検討要、Phase 3 設計段階で詳細化。
