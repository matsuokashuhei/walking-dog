# walking-dog — Monorepo

## General Rules

- **git コマンドを実行する前に必ず `pwd` で作業ディレクトリを確認する**

## Development Rules

### API (apps/api/)
- **Rust コマンドはすべて Docker 経由で実行する**
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

### Mobile (apps/mobile/)
- **Expo QR コードの確認方法**
  - ターミナルでは QR コードが表示されないため、ブラウザで以下の URL を開く:
    ```
    https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=exp%3A%2F%2F192.168.68.66%3A8081
    ```
  - `192.168.68.66` はホストマシンの LAN IP。変わった場合は `REACT_NATIVE_PACKAGER_HOSTNAME` も更新する。

- **npm コマンドはすべて Docker 経由で実行する**
  - `npm install`, `npm run`, `npx` などは直接実行しない
  - Docker Compose の `mobile` サービス経由で実行する:
    ```bash
    docker compose -f apps/compose.yml run --rm mobile npm install
    docker compose -f apps/compose.yml run --rm mobile npx expo start
    ```
  - または既存コンテナで実行:
    ```bash
    docker compose -f apps/compose.yml exec mobile npm test
    ```

### E2E / Playwright (apps/playwright/)
- **`playwright-cli` を使う** — `npx playwright test` は使わない
- **すべて Docker Compose 経由で実行する**
  - 新規コンテナで実行:
    ```bash
    docker compose -f apps/compose.yml run --rm playwright playwright-cli ${COMMAND}
    ```
  - 起動済みコンテナで実行:
    ```bash
    docker compose -f apps/compose.yml exec playwright playwright-cli ${COMMAND}
    ```
  - 例:
    ```bash
    docker compose -f apps/compose.yml exec playwright playwright-cli open http://mobile:8081
    docker compose -f apps/compose.yml exec playwright playwright-cli snapshot
    docker compose -f apps/compose.yml exec playwright playwright-cli screenshot --filename=/logs/result.png
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

# Development Workflow

This project uses the obra/superpowers plugin. Always check for relevant skills before taking any action.

## PR修正ワークフロー

PRのレビューコメントへの対応は以下のスキルを順番に使うこと：

1. **receiving-code-review** — レビューコメントを受け取ったら、盲目的に実装せず必ず技術的に検証してから対応する
2. **test-driven-development** — 修正は必ずRED→GREEN→REFACTORのサイクルで行う。実装コードより先にテストを書くこと
3. **requesting-code-review** — 修正完了後、subagentにコードレビューを依頼する

## エージェントの引き継ぎ

コンテキストウィンドウの残量が少なくなってきたら：
- **dispatching-parallel-agents** または **subagent-driven-development** を使って作業を引き継ぐ
- 引き継ぎ時はコンテキストを最小限に絞って渡すこと

## セッション終了時

作業が終わったら必ずセッションを振り返り、学びをCLAUDE.mdまたはskillに反映すること。
