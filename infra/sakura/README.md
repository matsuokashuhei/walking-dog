# さくらVPS テスト環境

GraphQL サーバーと PostgreSQL をさくらVPS上で docker compose で運用するテスト環境。
Cognito / DynamoDB / S3 は AWS の dev 環境リソースを IAM ユーザー経由で利用する。

## アーキテクチャ

```
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│  さくらVPS                       │       │  AWS (ap-northeast-1)            │
│                                  │       │                                  │
│  ┌──────────────┐               │       │  Cognito User Pool               │
│  │ postgres:16   │◄──┐          │       │  DynamoDB                        │
│  └──────────────┘   │          │  ───► │  S3                              │
│                      │          │       │  ECR (walking-dog-api)           │
│  ┌──────────────┐   │          │       │                                  │
│  │ walking-dog   │───┘          │       │  IAM User:                       │
│  │ -api :3000    │              │       │    walking-dog-dev-vps-api       │
│  └──────────────┘               │       │                                  │
└─────────────────────────────────┘       └──────────────────────────────────┘
```

- Docker イメージは GitHub Actions でビルドし ECR に push
- VPS は ECR から pull するだけ（Rust のコンパイルは行わない）

## 前提

- Ubuntu 24.04 (noble) の さくらVPS（推奨 1GB RAM 以上）
- Docker と Docker Compose plugin がインストール済み
- AWS アクセスキー（`terraform output` から取得）

## 初回セットアップ

### 1. 必要なパッケージをインストール

```bash
# Docker（未導入の場合）
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin

# AWS CLI v2（Ubuntu 24.04 は apt に awscli パッケージがないため公式インストーラを使う）
sudo apt-get install -y unzip curl
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/

# 確認
aws --version
docker --version
```

ARM アーキテクチャの場合は `awscli-exe-linux-aarch64.zip` を使う。

### 2. リポジトリを clone

```bash
git clone https://github.com/matsuokashuhei/walking-dog.git
cd walking-dog/infra/sakura
```

### 3. 環境変数ファイルを作成

```bash
cp .env.example .env
vi .env
```

編集項目:

| 変数 | 取得元 |
|------|--------|
| `POSTGRES_PASSWORD` | 強いパスワードを新規生成 |
| `DATABASE_URL` | `POSTGRES_PASSWORD` と同じパスワードを埋め込む |
| `AWS_ACCESS_KEY_ID` | `terraform output vps_api_access_key_id` |
| `AWS_SECRET_ACCESS_KEY` | `terraform output -raw vps_api_secret_access_key` |
| `ECR_IMAGE` | `terraform output ecr_repository_url` + `:latest` |

その他（`DYNAMODB_TABLE_WALK_POINTS`, `S3_BUCKET_DOG_PHOTOS`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`）は `.env.example` の値をそのまま使う。

### 4. 初回デプロイ

```bash
./deploy.sh
```

### 5. 動作確認

```bash
curl http://localhost:3000/health
# → "ok"
```

## 更新デプロイ

main ブランチの `apps/api/` を更新すると GitHub Actions が自動で ECR に push する。
VPS では以下を実行するだけで最新版に更新できる:

```bash
cd ~/walking-dog/infra/sakura
./deploy.sh
```

`deploy.sh` の処理内容:
1. ECR にログイン（12時間有効なトークンを都度取得）
2. 最新イメージを pull
3. `docker compose up -d` でコンテナ再起動

PostgreSQL は `postgres_data` volume でデータ永続化されるため、API の再起動時にも保持される。

## トラブルシューティング

### API コンテナのログを見る

```bash
docker compose logs -f api
```

### DB マイグレーションが失敗する

`apps/api/src/main.rs` の起動時に `Migrator::up` が自動実行される。
失敗時は `DATABASE_URL` の接続情報を確認:

```bash
docker compose exec postgres psql -U walking_dog -d walking_dog_test
```

### ECR pull が `no basic auth credentials` エラー

ECR のトークンは 12 時間で期限切れ。`./deploy.sh` を再実行すれば解決する。

### VPS を再起動した後

`restart: unless-stopped` が設定されているため、コンテナは自動復旧する。手動での起動は不要。

## 関連リソース

- AWS IAM ユーザー: `walking-dog-dev-vps-api`
- ECR リポジトリ: `walking-dog-api`
- GitHub Actions workflow: [`.github/workflows/deploy-api.yml`](../../.github/workflows/deploy-api.yml)
- Terraform 定義: [`infra/aws/`](../aws/)
