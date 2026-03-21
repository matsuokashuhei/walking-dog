# walking-dog — Monorepo

## General Rules

- **git コマンドを実行する前に必ず `pwd` で作業ディレクトリを確認する**

## Development Rules

### API (apps/api/)
- **Rust コマンドはすべて Docker 経由で実行する**
  - `cargo build`, `cargo test`, `cargo run` などは直接実行しない
  - Docker Compose の `api` サービス経由で実行する:
    ```bash
    docker compose -f apps/api/compose.yml run --rm api cargo build
    docker compose -f apps/api/compose.yml run --rm api cargo test
    ```
  - または既存コンテナで実行:
    ```bash
    docker compose -f apps/api/compose.yml exec api cargo test
    ```

## Directory Structure

```
walking-dog/
├── apps/       # Deployable applications (depend on packages/)
│   ├── api/    # Backend API
│   ├── mobile/ # React Native / Expo app
│   └── web/    # Web frontend
├── docs/       # Design documents and specs
├── infra/      # Cloud infrastructure (IaC)
├── packages/   # Shared libraries used by apps/
│   ├── ui/     # (future) Shared UI components
│   ├── types/  # (future) Shared TypeScript types
│   └── utils/  # (future) Shared utilities
└── README.md
```
