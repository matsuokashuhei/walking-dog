# e2e — Development Rules

## すべて Docker Compose 経由で実行する

### テスト実行（`npx playwright test`）

- 全テスト実行（ja-JP + en-US）:
  ```bash
  docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test
  ```
- ロケール別実行:
  ```bash
  docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test --project "iPhone 14 - ja-JP"
  docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test --project "iPhone 14 - en-US"
  ```

### インタラクティブ操作（`playwright-cli`）

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

## スクリーンショットのファイル名

- 形式: `YYYYmmddHHMMSS-{xxx}.png`
- 例: `20260322143025-login.png`

## ロケール

2つのロケールでテストすること：

- `ja-JP`
- `en-US`

`playwright.config.ts` の projects で両ロケールが定義されている。ラベルは `tests/helpers/i18n.ts` で管理。

## テストの構成

```
tests/
├── helpers/
│   ├── i18n.ts          # ロケール別ラベルマップ
│   ├── fixtures.ts      # カスタム test fixture (labels)
│   ├── auth.ts          # 認証ヘルパー (registerUser, loginUser, etc.)
│   ├── navigation.ts    # ナビゲーションヘルパー
│   └── screenshot.ts    # スクリーンショットヘルパー (YYYYmmddHHMMSS-{xxx}.png)
├── smoke.spec.ts        # スモークテスト
├── auth.spec.ts         # 認証テスト
└── dogs.spec.ts         # 犬プロフィール CRUD テスト
```
