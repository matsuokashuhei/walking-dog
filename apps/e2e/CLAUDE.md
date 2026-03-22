# e2e — Development Rules

## `playwright-cli` を使う — `npx playwright test` は使わない

## すべて Docker Compose 経由で実行する

- 新規コンテナで実行:
  ```bash
  docker compose -f apps/compose.yml run --rm e2e playwright-cli ${COMMAND}
  ```
- 起動済みコンテナで実行:
  ```bash
  docker compose -f apps/compose.yml exec e2e playwright-cli ${COMMAND}
  ```
- 例:
  ```bash
  docker compose -f apps/compose.yml exec e2e playwright-cli open http://mobile:8081
  docker compose -f apps/compose.yml exec e2e playwright-cli snapshot
  docker compose -f apps/compose.yml exec e2e playwright-cli screenshot --filename=/logs/result.png
  ```
