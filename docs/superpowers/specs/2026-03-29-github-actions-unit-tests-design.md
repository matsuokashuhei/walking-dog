# GitHub Actions ユニットテスト追加 設計書

## 背景

現在、CI/CD は `deploy-api.yml`（デプロイ専用）のみで、ユニットテストをCIで実行する仕組みがない。
PR マージ前にテストを自動実行し、品質を担保する。

## スコープ

- Mobile（Jest）と API（cargo test）のユニットテストを GitHub Actions で実行する
- E2E テストは対象外（依存が多く、別途検討）

## 設計判断

| 項目 | 決定 | 理由 |
|------|------|------|
| 対象 | Mobile + API | E2E は依存が多く別途対応 |
| トリガー | パスフィルタ付き | 無関係な変更でテストを走らせない |
| ファイル構成 | アプリごとに分離 | トリガー条件が異なり、独立管理が自然 |
| API テスト実行方法 | Docker Compose | ローカルとCIで同じ構成、環境差異を最小化 |

## ワークフロー1: test-mobile.yml

- **トリガー**: `apps/mobile/**` への push（main）/ PR
- **実行環境**: `ubuntu-latest`
- **手順**:
  1. Checkout
  2. Node.js セットアップ（npm cache 有効化）
  3. `npm ci`
  4. `npm test`
- **working-directory**: `apps/mobile`

## ワークフロー2: test-api.yml

- **トリガー**: `apps/api/**` への push（main）/ PR
- **実行環境**: `ubuntu-latest`
- **手順**:
  1. Checkout
  2. `docker compose -f apps/compose.yml run --rm api cargo test`
- Docker Compose が依存サービス（postgres, dynamodb-local, localstack, cognito-local）を自動起動

## 作成するファイル

- `.github/workflows/test-mobile.yml`
- `.github/workflows/test-api.yml`

## 確認事項（実装時）

- Mobile の Node.js バージョンを compose.yml / Dockerfile から確認して合わせる
- API の Docker Compose が CI 環境で正しく動作するか確認

## 検証方法

1. `apps/mobile/**` を変更する PR を作成し、Mobile テストのみが実行されることを確認
2. `apps/api/**` を変更する PR を作成し、API テストのみが実行されることを確認
3. `apps/mobile/**` にも `apps/api/**` にも該当しない変更で、テストがスキップされることを確認
