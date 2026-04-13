# ECR ベースのさくらVPSデプロイに変更

## Context

前回の計画では VPS 上で `docker compose build` を実行する構成だったが、VPS のスペック不足により Rust コンパイルが失敗する。そのため、GitHub Actions で Docker イメージをビルドして ECR に push し、VPS は ECR から pull するだけの構成に変更する。

既存の `deploy-api.yml` はすでに ECR への push ロジックを持つが、ECR リポジトリ自体と IAM 権限がコメントアウトされているため動作しない。これらを有効化し、ECS 用のステップを取り除く。

## 変更ファイル一覧

| 操作 | ファイル | 内容 |
|------|---------|------|
| CREATE | `infra/aws/ecr.tf` | ECR リポジトリ定義 |
| MODIFY | `infra/aws/github_oidc.tf` | ECR push 権限を GitHub Actions ロールに付与（ECS 部分は削除） |
| MODIFY | `infra/aws/iam_vps.tf` | VPS IAM ユーザーに ECR pull 権限を追加 |
| MODIFY | `infra/aws/outputs.tf` | `ecr_repository_url` output を追加 |
| MODIFY | `.github/workflows/deploy-api.yml` | ECS 関連ステップを削除、build + push のみ |
| MODIFY | `infra/sakura/compose.yml` | `build:` → `image:` に変更（ECR イメージを参照） |
| MODIFY | `infra/sakura/.env.example` | `ECR_IMAGE` 変数を追加 |
| CREATE | `infra/sakura/deploy.sh` | ECR login → pull → compose up のデプロイスクリプト |

## Step 1: ECR リポジトリ作成

**新規ファイル: `infra/aws/ecr.tf`**

```hcl
resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# 古いイメージを削除するライフサイクルポリシー（コスト削減）
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

## Step 2: GitHub Actions ロールに ECR 権限付与

**`infra/aws/github_oidc.tf`** のコメントアウトを解除し、ECS 部分を削除:

```hcl
resource "aws_iam_role_policy" "github_actions" {
  name = "${var.project_name}-github-actions"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ECRAuth"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = aws_ecr_repository.api.arn
      },
    ]
  })
}
```

## Step 3: VPS IAM ユーザーに ECR pull 権限追加

**`infra/aws/iam_vps.tf`** の `aws_iam_user_policy.vps_api` に追加:

```hcl
{
  Sid      = "ECRAuth"
  Effect   = "Allow"
  Action   = ["ecr:GetAuthorizationToken"]
  Resource = "*"
},
{
  Sid    = "ECRPull"
  Effect = "Allow"
  Action = [
    "ecr:BatchCheckLayerAvailability",
    "ecr:GetDownloadUrlForLayer",
    "ecr:BatchGetImage",
  ]
  Resource = aws_ecr_repository.api.arn
},
```

## Step 4: outputs.tf に ECR URL 追加

**`infra/aws/outputs.tf`** に追加:

```hcl
output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}
```

## Step 5: deploy-api.yml を build+push のみに簡略化

**`.github/workflows/deploy-api.yml`**:
- `env` から `ECS_CLUSTER`, `ECS_SERVICE`, `TASK_FAMILY`, `CONTAINER_NAME` を削除
- 以下のステップを削除:
  - `Download current task definition`
  - `Update image in task definition`
  - `Register new task definition revision`
  - `Update ECS service (if running)`
- 残すのは: Checkout, Configure AWS, Login ECR, Buildx, Build & Push

## Step 6: VPS compose.yml を image 参照に変更

**`infra/sakura/compose.yml`**:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: walking_dog
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: walking_dog_test
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    image: ${ECR_IMAGE}
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

## Step 7: .env.example に ECR_IMAGE 追加

**`infra/sakura/.env.example`** に追加:

```env
# ECR image URL (terraform output: ecr_repository_url)
# 例: 967026628831.dkr.ecr.ap-northeast-1.amazonaws.com/walking-dog-api:latest
ECR_IMAGE=<account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/walking-dog-api:latest
```

## Step 8: deploy.sh 作成

**新規ファイル: `infra/sakura/deploy.sh`**

```bash
#!/bin/bash
set -euo pipefail

# Load .env
set -a
source .env
set +a

# ECR login
AWS_ACCOUNT_ID=$(echo "$ECR_IMAGE" | cut -d. -f1)
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
      "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Pull latest image
docker compose pull api

# Restart services (postgres unaffected if only api changed)
docker compose up -d
```

実行権限付与: `chmod +x deploy.sh`

## VPS での初回セットアップ

```bash
# AWS CLI をインストール
sudo apt-get update && sudo apt-get install -y awscli

# リポジトリ clone
git clone https://github.com/matsuokashuhei/walking-dog.git
cd walking-dog/infra/sakura

# .env 作成（ECR_IMAGE も含めて編集）
cp .env.example .env
vi .env

# 初回デプロイ
./deploy.sh
```

## 運用（更新時）

GitHub Actions が main にマージ時に自動で ECR に push する。VPS で:

```bash
cd ~/walking-dog/infra/sakura
git pull  # compose.yml や deploy.sh の変更を取り込む
./deploy.sh
```

## Verification

### Terraform 適用後
```bash
# ECR が作成されたか確認
terraform output ecr_repository_url
```

### GitHub Actions
- main への push で workflow 成功
- ECR のコンソールで `walking-dog-api:latest` と `:<sha>` のタグ確認

### VPS
```bash
./deploy.sh
# pull 成功 → docker compose up -d 成功
curl http://localhost:3000/health  # → "ok"
```

## 注意事項

- `AWS_ROLE_ARN` GitHub Secret が設定済みか要確認（既存 workflow が使っている）
- VPS に AWS CLI が必要（`aws ecr get-login-password` のため）
- ECR の login token は 12 時間で期限切れになるが、`deploy.sh` 実行時に毎回 login するため問題なし
- ECR ライフサイクルポリシーで直近 10 イメージのみ保持（古いものは自動削除）
