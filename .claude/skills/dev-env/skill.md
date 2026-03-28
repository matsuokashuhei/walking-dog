---
name: dev-env
description: Start or stop the AWS dev environment (RDS, ECS, ALB, Route53). Use when the user says "start", "stop", "起動", "停止", or asks about the dev server status.
---

# Dev Environment Control

AWS dev 環境（RDS, ALB, ECS Service, Route53）を起動・停止する。
Lambda `walking-dog-dev-scheduler` を呼び出して制御する。

ARGUMENTS には `start` または `stop` を指定する。引数がない場合はユーザーに確認する。

## Prerequisites

AWS SSO login が必要：

```bash
aws sso login --profile personal
```

## Start

```bash
aws lambda invoke --profile personal --region ap-northeast-1 \
  --function-name walking-dog-dev-scheduler \
  --payload "$(echo '{"action":"start"}' | base64)" \
  --cli-read-timeout 900 /tmp/lambda-output.json 2>&1 && cat /tmp/lambda-output.json
```

起動後の確認：

```bash
# Health check（DNS 伝播前は --resolve を使う）
curl -s https://walkingdogdev.dpdns.org/health

# DNS が解決できない場合
ALB_IP=$(dig +short walkingdogdev.dpdns.org | head -1)
curl -s --resolve "walkingdogdev.dpdns.org:443:$ALB_IP" https://walkingdogdev.dpdns.org/health
```

## Stop

```bash
aws lambda invoke --profile personal --region ap-northeast-1 \
  --function-name walking-dog-dev-scheduler \
  --payload "$(echo '{"action":"stop"}' | base64)" \
  --cli-read-timeout 900 /tmp/lambda-output.json 2>&1 && cat /tmp/lambda-output.json
```

停止後の確認：

```bash
# ECS Service
aws ecs describe-services --profile personal --region ap-northeast-1 \
  --cluster walking-dog-dev --services walking-dog-dev-api \
  --query 'services[0].{status:status,desiredCount:desiredCount,runningCount:runningCount}' --output json

# ALB（LoadBalancerNotFound なら削除済み）
aws elbv2 describe-load-balancers --profile personal --region ap-northeast-1 \
  --names walking-dog-dev --query 'LoadBalancers[0].State' --output json

# RDS（stopping or stopped なら OK）
aws rds describe-db-instances --profile personal --region ap-northeast-1 \
  --db-instance-identifier walking-dog-dev \
  --query 'DBInstances[0].DBInstanceStatus' --output text
```

## What the Lambda does

### start
1. RDS 起動 → available まで待機
2. ALB 作成（HTTPS + HTTP→HTTPS リダイレクト）
3. Target Group 作成（port 3000, health check `/health`）
4. ECS Service 作成（Fargate, desired_count=1）
5. Route53 A レコード更新（`walkingdogdev.dpdns.org` → ALB）

### stop
1. ECS Service 削除（desired_count=0 → force delete）
2. ALB / Listener / Target Group 削除
3. Route53 A レコード削除
4. RDS 停止
