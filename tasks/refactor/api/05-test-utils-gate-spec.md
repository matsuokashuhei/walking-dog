# 要件仕様書: `NoOpJwtVerifier` を `test-utils` feature gate に隔離

- 対象: `apps/api/`
- 出発点: `tasks/refactor/api/04-followup.md` 項目 #3 (Medium)
- 関連: `tasks/lessons.md` 2026-04-16「テスト用 fake/NoOp 実装は feature gate で本番バイナリから排除する」
- 推奨対処案: A (`#[cfg(any(test, feature = "test-utils"))]` gate + `Cargo.toml` feature 定義)

## 1. 目的

Phase 10 (PR #97) で導入した `NoOpJwtVerifier` が production binary に公開されたまま。DI 注入されない限り呼ばれないので実害は無いが、予防的に test-utils feature gate で隔離し production binary から除去する。規約として他の test-only 構造体も同 gate の対象とする。

## 2. 機能要件

- **FR-1**: `apps/api/Cargo.toml` に `[features]` セクションを追加し、`test-utils = []` を定義する (default 無効)
- **FR-2**: feature 名は `test-utils` 統一
- **FR-3**: `apps/api/src/auth/jwt.rs` の `NoOpJwtVerifier` struct と `impl JwtVerifier for NoOpJwtVerifier` 両方に `#[cfg(any(test, feature = "test-utils"))]` 付与
- **FR-4**: doc comment は struct 直前の gate 下に残置
- **FR-5**: `#[cfg(test)] mod tests` ブロックは変更禁止 (自動的に gate 有効)
- **FR-6**: Gate は `#[cfg(any(test, feature = "test-utils"))]` を採用 (cfg(feature only) 単独は unit test が壊れるため)
- **FR-7**: `apps/api/tests/support/client.rs` の `NoOpJwtVerifier` 参照は変更しない (integration test 経由で feature が自動伝播)
- **FR-8**: integration test 実行時は `--features test-utils` 必須、`apps/api/CLAUDE.md` に明示
- **FR-9**: `.github/workflows/test-api.yml` の cargo test invocation に `--features test-utils` 追加
- **FR-10**: `.claude/agents/{tester_ja,pge-evaluator,inspector_ja,implementer-api_ja}.md` 内の cargo test 呼び出しを `cargo test --features test-utils` 形式に置換
- **FR-11**: `apps/api/CLAUDE.md` に「Test Execution / Feature Flags」節追加 (feature 要否 + test-only 実装 gate 規約)
- **FR-12**: `tasks/lessons.md` 2026-04-16 エントリに「規約として適用」セクション追加

## 3. 非機能要件

- **NFR-1**: `cargo build --release` 出力の binary に対し `strings | grep -i NoOp` が **0 hits**
- **NFR-2**: lib 61 件 + integration 61+ 件すべて変更前後で緑維持
- **NFR-3**: 単一 integration test 個別実行が `--features test-utils` 付きで動作
- **NFR-4**: CI 実行時間 ±10% 以内
- **NFR-5**: `.github/workflows/test-api.yml` の paths filter (`apps/api/**`) は変更しない
- **NFR-6**: `cargo test --lib` が feature 指定無しで動く性質を維持
- **NFR-7**: 新規 contributor が `apps/api/CLAUDE.md` のみで規約を把握可能
- **NFR-8**: runtime のセキュリティは変化なし (注入防止のみ)

## 4. 受け入れ基準

### コード
- **AC-1**: `apps/api/Cargo.toml` に `[features]\ntest-utils = []` あり
- **AC-2**: `jwt.rs` の `NoOpJwtVerifier` struct に `#[cfg(any(test, feature = "test-utils"))]` 付与
- **AC-3**: `jwt.rs` の `impl JwtVerifier for NoOpJwtVerifier` に `#[cfg(any(test, feature = "test-utils"))]` 付与
- **AC-4**: `docker compose -f apps/compose.yml run --rm api cargo test --lib` 全緑 (61 件想定、減らない)
- **AC-5**: `docker compose -f apps/compose.yml run --rm api cargo test --features test-utils -- --test-threads=1` 全緑 (実測件数を PR に記載)
- **AC-6**: `docker compose -f apps/compose.yml run --rm api cargo test --tests` (feature 無) が `NoOpJwtVerifier` 未解決で compile fail
- **AC-7**: 個別 `cargo test --features test-utils --test test_authorization` PASS
- **AC-8**: `cargo build --release` 成功
- **AC-9**: release binary `strings target/release/walking-dog-api | grep NoOpJwtVerifier` = 0 hits (exact name, case-sensitive。`-i NoOp` 粒度は AWS SDK `aws_smithy_observability::noop` に hit するため不可)
- **AC-10**: ~~変更前 binary で同 grep ≥ 1 hits~~ → **削除**。rustc DCE が release build で `pub` 未到達アイテムを除去するため変更前後ともに 0 hits となる。gate 効力の主要エビデンスは **AC-6 (compile-time enforcement)** で代替

### CI / エージェント
- **AC-11**: `.github/workflows/test-api.yml` に `--features test-utils` 含有
- **AC-12**: `.claude/agents/*.md` 7 箇所すべて更新済 (tester_ja 2 / pge-evaluator 1 / inspector_ja 2 / implementer-api_ja 2)

### ドキュメント
- **AC-13**: `apps/api/CLAUDE.md` に「Test Execution / Feature Flags」節あり
- **AC-14**: `apps/api/CLAUDE.md` に「test-only 実装は `#[cfg(any(test, feature = "test-utils"))]` で gate」規約明記
- **AC-15**: `tasks/lessons.md` 2026-04-16 エントリに「規約として適用」サブセクションあり
- **AC-16**: `tasks/refactor/api/04-followup.md` 項目 #3 に DONE + PR 番号追記

### 品質
- **AC-17**: `cargo fmt --check` 違反なし
- **AC-18**: `cargo clippy --features test-utils --all-targets -- -D warnings` 警告なし、かつ `cargo clippy -- -D warnings` (feature 無) も警告なし
- **AC-19**: `git diff apps/api/src/auth/jwt.rs` で line 105-129 の `#[cfg(test)] mod tests` ブロック差分ゼロ
- **AC-20**: `apps/api/tests/` 配下の変更なし
- **AC-21**: PR 本文に RED エビデンス (AC-6 compile error) / GREEN エビデンス (test pass) / strings エビデンス (変更後 `grep NoOpJwtVerifier` = 0 hits、AC-6 を gate 効力の主要証明として併記) を記載

## 5. スコープ外

- **OOS-1**: 代替案 B (別 crate `api-test-support`)
- **OOS-2**: `tests/support/` 配下の他 helper を gate 対象化
- **OOS-3**: apps/api 以外の crate への同種規約適用
- **OOS-4**: `cargo build --release` の CI 自動化
- **OOS-5**: `NoOpJwtVerifier` 以外の test-only 候補の洗い出し
- **OOS-6**: `.github/workflows/deploy-api.yml` への `--features test-utils` 追加 (production build なので付けない)
- **OOS-7**: staging で NoOp を使う運用導線
- **OOS-8**: 04-followup.md の他項目 (#1, #2, #4, #5)
- **OOS-9**: `docs/superpowers/specs/*.md` / `docs/superpowers/plans/*.md` / `.claude/plans/*.md` 配下の履歴 cargo test 記述 (履歴書を遡って編集しない)
- **OOS-10**: `apps/api/tests/support/tokens.rs:2` の doc comment 内 `NoOpJwtVerifier` 言及 (文字列のみ、release binary に含まれない)
