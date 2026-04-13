# 散歩保存エラー ("Failed to save walk") 調査結果

## Context

散歩中に「Finish」ボタンを押したところ "Failed to save walk. Please try again." エラーが表示された。

## 根本原因

**DynamoDB `WalkPoints` テーブルが存在しない。**

```
$ aws dynamodb list-tables --endpoint-url http://localhost:8000
{ "TableNames": [] }
```

### エラーフロー

1. モバイル `walk.tsx:117` — `addWalkPoints.mutateAsync()` を呼び出す
2. API `custom_mutations.rs:1037` — `walk_points_service::add_walk_points()` が DynamoDB `WalkPoints` テーブルに batch_write を実行
3. DynamoDB が `ResourceNotFoundException` を返す（テーブルが存在しないため）
4. API が `INTERNAL_SERVER_ERROR` を GraphQL レスポンスで返す
5. モバイル `walk.tsx:126` — catch ブロックで汎用エラー "Failed to save walk" を表示

### なぜテーブルがないか

- `scripts/setup.sh` に DynamoDB テーブル作成処理がある（66-87行目）
- Docker Compose の `dynamodb-local` は `dynamodb_data` volume にデータを永続化するが、volume が再作成されたか、`setup.sh` が実行されていない

## 修正方法

`scripts/setup.sh` を再実行してテーブルを作成する：

```bash
scripts/setup.sh
```

または手動でテーブルを作成する：

```bash
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name WalkPoints \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

## 関連ファイル

| ファイル | 行 | 内容 |
|---------|---|------|
| `apps/mobile/app/(tabs)/walk.tsx` | 109-131 | handleStop: addWalkPoints → finishWalk → catch |
| `apps/api/src/services/walk_points_service.rs` | 22-64 | DynamoDB batch_write |
| `apps/api/src/graphql/custom_mutations.rs` | 1002-1050 | addWalkPoints mutation handler |
| `scripts/setup.sh` | 55-87 | DynamoDB テーブル作成 |

## 検証方法

1. テーブル作成後に `list-tables` で確認
2. アプリで散歩を開始 → 数秒歩く → Finish → エラーなく完了することを確認
