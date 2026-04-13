# E2E Test Plan: Computer Use による手動テスト

## Context
ローカル環境でバックエンドとiOSシミュレーターを起動し、Computer Use MCP を使ってアプリを操作してE2Eテストを実施する。

## Step 1: バックエンド起動
- `docker compose -f apps/compose.yml up -d` で全サービスを起動
- Monitor で起動完了を確認（postgres, dynamodb-local, localstack, cognito-local, api）

## Step 2: iOS シミュレーター起動
- `apps/mobile/` で `npm run ios` を実行（バックグラウンド）
- Monitor でビルド・起動完了を確認

## Step 3: Computer Use で E2E テスト
- **アカウント作成**: test@test.com / password123 で新規登録
  - ログイン画面 → 登録画面へ遷移
  - メール・パスワード入力 → 登録実行
  - 確認コード入力（cognito-local の場合、固定コードの可能性あり）
- **ログイン**: 作成したアカウントでログイン確認

## Key Files
- `apps/compose.yml` — Docker サービス定義
- `apps/mobile/app/(auth)/login.tsx` — ログイン画面
- `apps/mobile/app/(auth)/register.tsx` — 登録画面
- `apps/mobile/lib/auth/api.ts` — GraphQL 認証 API

## Verification
- アプリがタブ画面（ホーム）に遷移したらログイン成功
