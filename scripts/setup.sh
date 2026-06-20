#!/usr/bin/env bash
# Walking Dog — Development environment setup script
# Usage: ./scripts/setup.sh
#
# Run from repository root after docker system/volume prune.
set -euo pipefail

COMPOSE_FILE="apps/compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: Run this script from the repository root." >&2
  exit 1
fi

echo "=== Walking Dog Development Environment Setup ==="

# 1. Start infrastructure services
echo ""
echo "[1/4] Starting infrastructure services..."
docker compose -f "$COMPOSE_FILE" up -d postgres dynamodb-local minio elasticmq

# 2. Wait for PostgreSQL, then run migrations
echo ""
echo "[2/4] Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U walking_dog > /dev/null 2>&1; then
    echo "  PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Error: PostgreSQL did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

echo "  Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm api cargo run -p migration
echo "  Migrations complete."

# 3. Create DynamoDB tables and S3 buckets
echo ""
echo "[3/4] Creating AWS local resources..."

echo "  Waiting for DynamoDB Local..."
for i in $(seq 1 30); do
  if curl -s -X POST "http://localhost:8000" \
    -H 'Content-Type: application/x-amz-json-1.0' \
    -H 'X-Amz-Target: DynamoDB_20120810.ListTables' \
    -H 'X-Amz-Date: 20260101T000000Z' \
    -H 'Authorization: AWS4-HMAC-SHA256 Credential=test/20260101/ap-northeast-1/dynamodb/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=dummy' \
    -d '{"Limit":1}' > /dev/null 2>&1; then
    echo "  DynamoDB Local is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Error: DynamoDB Local did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

echo "  Waiting for MinIO..."
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:9000/minio/health/ready" > /dev/null 2>&1; then
    echo "  MinIO is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Error: MinIO did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

# DynamoDB table (amazon/dynamodb-local — data is persisted to volume)
DYNAMO_URL="http://localhost:8000"
DYNAMO_HEADERS='-H "Content-Type: application/x-amz-json-1.0" -H "X-Amz-Date: 20260101T000000Z" -H "Authorization: AWS4-HMAC-SHA256 Credential=test/20260101/ap-northeast-1/dynamodb/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=dummy"'

TABLES=$(curl -s -X POST "$DYNAMO_URL" \
  -H 'Content-Type: application/x-amz-json-1.0' \
  -H 'X-Amz-Target: DynamoDB_20120810.ListTables' \
  -H 'X-Amz-Date: 20260101T000000Z' \
  -H 'Authorization: AWS4-HMAC-SHA256 Credential=test/20260101/ap-northeast-1/dynamodb/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=dummy' \
  -d '{"Limit":100}')

if echo "$TABLES" | grep -q '"WalkPoints"'; then
  echo "  DynamoDB table WalkPoints already exists."
else
  curl -s -X POST "$DYNAMO_URL" \
    -H 'Content-Type: application/x-amz-json-1.0' \
    -H 'X-Amz-Target: DynamoDB_20120810.CreateTable' \
    -H 'X-Amz-Date: 20260101T000000Z' \
    -H 'Authorization: AWS4-HMAC-SHA256 Credential=test/20260101/ap-northeast-1/dynamodb/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=dummy' \
    -d '{
      "TableName": "WalkPoints",
      "AttributeDefinitions": [
        {"AttributeName": "pk", "AttributeType": "S"},
        {"AttributeName": "sk", "AttributeType": "S"}
      ],
      "KeySchema": [
        {"AttributeName": "pk", "KeyType": "HASH"},
        {"AttributeName": "sk", "KeyType": "RANGE"}
      ],
      "BillingMode": "PAY_PER_REQUEST"
    }' > /dev/null
  echo "  DynamoDB table WalkPoints created."
fi

# S3 bucket (MinIO — initialized by the minio-init compose service)
docker compose -f "$COMPOSE_FILE" up minio-init
echo "  S3 bucket dog-photos ensured."

# SQS queues are declared in apps/elasticmq/elasticmq.conf and created
# automatically when the elasticmq container starts. No setup needed here.

# 4. Start all services
echo ""
echo "[4/4] Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "=== Setup Complete ==="
echo "API:            http://localhost:3000"
echo "GraphQL:        http://localhost:3000/graphql"
echo "PostgreSQL:     localhost:5432"
echo "DynamoDB Local: http://localhost:8000"
echo "MinIO(S3):      http://localhost:9000"
echo "MinIO Console:  http://localhost:9001"
echo ""
echo "Cognito:        configure apps/api/.env.local with real AWS Cognito values"
