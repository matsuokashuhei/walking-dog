# さくらVPS テスト環境

GraphQL サーバーと PostgreSQL をさくらVPS上で docker compose で運用するテスト環境。
Cognito / DynamoDB / S3 は AWS の dev 環境リソースを IAM ユーザー経由で利用する。
犬の写真は S3 バケットを CloudFront 経由で配信する。

## アーキテクチャ

```
   HTTPS (walking-dog.cacheandbuffer.com)
        │
        ▼
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│  さくらVPS                       │       │  AWS (ap-northeast-1)            │
│                                  │       │                                  │
│  ┌──────────────┐               │       │  Cognito User Pool               │
│  │ caddy :80/443│◄── Let's      │       │  DynamoDB                        │
│  │  (reverse    │    Encrypt    │  ───► │  S3                              │
│  │   proxy)     │               │       │  ECR (walking-dog-api)           │
│  └──────┬───────┘               │       │                                  │
│         │ :3000 (internal)      │       │  Cloudflare DNS                  │
│  ┌──────▼───────┐               │       │                                  │
│  │ walking-dog   │──┐            │       │  IAM User:                       │
│  │ -api :3000    │  │            │       │    walking-dog-dev-vps-api       │
│  └──────────────┘  │            │       │                                  │
│  ┌──────────────┐  │            │       │                                  │
│  │ postgres:16  │◄─┘            │       │                                  │
│  └──────────────┘               │       │  CloudFront ──► S3 (avatars/photos) │
└─────────────────────────────────┘       └──────────────────────────────────┘
                                                   ▲
                                                   │ HTTPS (写真配信)
                                               モバイルアプリ
```

- Docker イメージは GitHub Actions でビルドし ECR に push
- VPS は ECR から pull するだけ（Rust のコンパイルは行わない）
- Caddy が Let's Encrypt 証明書を自動取得・更新して HTTPS 終端する
- `walking-dog.cacheandbuffer.com` の A レコードは Cloudflare DNS で VPS IP を指す
- アバターと散歩写真は専用の CloudFront distribution（`avatars` 用 / `photos` 用）から配信する。S3 バケットは OAC 経由でのみアクセス可能（`infra/aws/cloudfront.tf` 参照）

## 前提

- Ubuntu 24.04 (noble) の さくらVPS（推奨 1GB RAM 以上）
- Docker と Docker Compose plugin がインストール済み
- AWS アクセスキー（`terraform output` から取得）
- さくらVPS のパケットフィルタで **TCP 22 / 80 / 443** を許可
- Cloudflare DNS の `walking-dog.cacheandbuffer.com` A レコードが VPS IP を指している

Cloudflare の設定:

| Type | Name | Value | Proxy status |
|------|------|-------|--------------|
| `A` | `walking-dog` | `133.167.103.109` | `DNS only` |

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
| `AVATAR_CDN_URL` | `terraform output -raw cloudfront_avatars_url` |
| `PHOTO_CDN_URL` | `terraform output -raw cloudfront_photos_url` |

その他（`AWS_DYNAMODB_TABLE_TRACK_POINT`, `AWS_SQS_QUEUE_URL_TRACK_POINT`, `AWS_S3_BUCKET_AVATAR`, `AWS_S3_BUCKET_PHOTO`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`）は `.env.example` の値をそのまま使う。

`AVATAR_CDN_URL` / `PHOTO_CDN_URL` は API が GraphQL の `avatar` / `photoUrl` フィールドを組み立てるときに S3 オブジェクトキーの前に付ける CloudFront のベース URL。`.env.example` のデフォルト値で動くが、distribution を作り直した場合は `terraform output -raw cloudfront_avatars_url` / `cloudfront_photos_url` の値に差し替える。

### 4. 初回デプロイ

```bash
./deploy.sh
```

### 5. 動作確認

```bash
# HTTPS 経由（外部から。Caddy が Let's Encrypt 証明書を自動取得するので初回は数十秒かかる）
curl https://walking-dog.cacheandbuffer.com/health
# → "ok"

# VPS 内部から api コンテナへ直接
docker compose exec api curl -s http://localhost:3000/health
# → "ok"
```

初回起動時、Caddy は Let's Encrypt に HTTP-01 challenge で証明書取得をリクエストする。
証明書は `caddy_data` volume に保存され、期限 90 日の 30 日前に自動更新される。

証明書取得が失敗する場合は Caddy のログを確認:

```bash
docker compose logs -f caddy
```

よくある失敗理由:
- パケットフィルタで 80/443 が閉じている
- DNS が VPS IP を指していない（`dig walking-dog.cacheandbuffer.com +short` で確認）
- Let's Encrypt のレート制限（同じドメインで失敗を繰り返すと一時的に ban される）

## 更新デプロイ

main ブランチの `apps/api/` を更新すると GitHub Actions が自動で ECR に push する。
VPS では以下を実行するだけで最新版に更新できる:

```bash
cd ~/walking-dog/infra/sakura
./deploy.sh
```

`deploy.sh` の処理内容:
1. `git pull --ff-only` で `infra/sakura/` の tracked file を最新化
2. ECR にログイン（12時間有効なトークンを都度取得）
3. 最新イメージを pull
4. `docker compose up -d --force-recreate` でコンテナを再作成

PostgreSQL は `postgres_data` volume でデータ永続化されるため、API の再起動時にも保持される。

### 環境変数を追加・変更した場合

`.env` を更新しただけでは既存コンテナには反映されない。以下で再作成する:

```bash
cd ~/walking-dog/infra/sakura
vi .env                              # 変数を追記・編集
./deploy.sh
docker compose exec api env | grep <VAR_NAME>     # 反映確認
docker compose exec walker env | grep <VAR_NAME>  # worker 側も確認
```

例: `AWS_SQS_QUEUE_URL_TRACK_POINT` や `PHOTO_CDN_URL` を追加したとき、`docker compose restart` だけでは `env_file` を再読込しない環境があるため、`deploy.sh` 経由での `--force-recreate` を前提にする。

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
