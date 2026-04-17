# api — Development Rules

## Rust コマンドはすべて Docker 経由で実行する

- `cargo build`, `cargo test`, `cargo run` などは直接実行しない
- Docker Compose の `api` サービス経由で実行する:
  ```bash
  docker compose -f apps/compose.yml run --rm api cargo build
  docker compose -f apps/compose.yml run --rm api cargo test --features test-utils
  ```
- または既存コンテナで実行:
  ```bash
  docker compose -f apps/compose.yml exec api cargo test --features test-utils
  ```
- **注**: `cargo test --lib` (unit test のみ) は feature 不要。integration test を含む `cargo test` 系は `--features test-utils` 必須 (詳細は下の「Test Execution / Feature Flags」節)

## JWT 検証の仕組み

Production では `CognitoJwtVerifier` が JWKS エンドポイントから公開鍵を取得し JWT を検証する。
Integration tests では `NoOpJwtVerifier` を注入することで、実際の Cognito トークンなしにテストが動く。

### cognito-local (ローカル開発) の制約

- `jagregory/cognito-local` は JWKS エンドポイント (`/.well-known/jwks.json`) をサポートしている
- ただし issuer が `0.0.0.0` になるため、本番と issuer 形式が異なる
- `CognitoJwtVerifier` は `COGNITO_ENDPOINT_URL` が設定されている場合に issuer バリデーションをスキップする
- ローカル開発で cognito-local の JWT を使う場合は `.env.local` に `COGNITO_ENDPOINT_URL=http://cognito-local:9229` を設定する

### テスト環境での認証

- Integration tests は `tests/support/client.rs` の `test_client()` 関数が `NoOpJwtVerifier` を注入する
- `NoOpJwtVerifier` は Bearer トークンの値をそのまま cognito_sub として扱う
- `test-token` → `test-user-cognito-sub` にマップ (後方互換性のため)
- `TEST_MODE` 環境変数は不要。Production binary に TEST_MODE 分岐は存在しない

## Test Execution / Feature Flags

- Integration test 実行時は `--features test-utils` が必須:
  ```bash
  docker compose -f apps/compose.yml run --rm api cargo test --features test-utils -- --test-threads=1
  ```
- `cargo test --lib` は feature 指定不要 (unit test は `#[cfg(test)]` 経由で解決)
- Production build (`cargo build --release`) には `--features test-utils` を **付けない**
- test-only 実装 (fake / NoOp / mock 構造体) は `#[cfg(any(test, feature = "test-utils"))]` で gate する規約
