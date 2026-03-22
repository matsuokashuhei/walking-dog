# api — Development Rules

## Rust コマンドはすべて Docker 経由で実行する

- `cargo build`, `cargo test`, `cargo run` などは直接実行しない
- Docker Compose の `api` サービス経由で実行する:
  ```bash
  docker compose -f apps/compose.yml run --rm api cargo build
  docker compose -f apps/compose.yml run --rm api cargo test
  ```
- または既存コンテナで実行:
  ```bash
  docker compose -f apps/compose.yml exec api cargo test
  ```
