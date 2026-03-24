#!/usr/bin/env bash
# Walking Dog — Development environment setup script
# Usage: ./scripts/setup.sh
#
# Run from repository root after docker system/volume prune.
set -euo pipefail

COMPOSE_FILE="apps/compose.yml"
SEED_DIR="apps/cognito-local/seed"
DB_DIR="apps/cognito-local/db"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: Run this script from the repository root." >&2
  exit 1
fi

echo "=== Walking Dog Development Environment Setup ==="

# 1. Initialize cognito-local DB from seed files
echo ""
echo "[1/5] Initializing cognito-local database from seed..."
mkdir -p "$DB_DIR"
cp "$SEED_DIR"/local_2yovNmW0.json "$DB_DIR"/local_2yovNmW0.json
cp "$SEED_DIR"/clients.json "$DB_DIR"/clients.json
echo "  Done."

# 2. Start infrastructure services
echo ""
echo "[2/5] Starting infrastructure services..."
docker compose -f "$COMPOSE_FILE" up -d postgres dynamodb-local localstack cognito-local

# 3. Wait for PostgreSQL, then run migrations
echo ""
echo "[3/5] Waiting for PostgreSQL..."
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

# 4. Create DynamoDB tables and S3 buckets
echo ""
echo "[4/5] Creating AWS local resources..."

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

# S3 bucket (LocalStack — recreated on each container start)
docker compose -f "$COMPOSE_FILE" exec -T localstack awslocal s3 mb s3://dog-photos > /dev/null 2>&1 || true
echo "  S3 bucket dog-photos ensured."

# 5. Start all services
echo ""
echo "[5/5] Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "=== Setup Complete ==="
echo "API:            http://localhost:3000"
echo "GraphQL:        http://localhost:3000/graphql"
echo "Cognito Local:  http://localhost:9229"
echo "PostgreSQL:     localhost:5432"
echo "DynamoDB Local: http://localhost:8000"
echo "LocalStack(S3): http://localhost:4566"
echo ""
echo "User Pool ID:   local_2yovNmW0"
echo "Client ID:      418806fx3afm9cp1mdhxwpxw3"
