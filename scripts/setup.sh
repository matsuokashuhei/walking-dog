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
echo "[1/4] Initializing cognito-local database from seed..."
mkdir -p "$DB_DIR"
cp "$SEED_DIR"/local_2yovNmW0.json "$DB_DIR"/local_2yovNmW0.json
cp "$SEED_DIR"/clients.json "$DB_DIR"/clients.json
echo "  Done."

# 2. Start infrastructure services
echo ""
echo "[2/4] Starting infrastructure services..."
docker compose -f "$COMPOSE_FILE" up -d postgres localstack cognito-local

# 3. Wait for PostgreSQL, then run migrations
echo ""
echo "[3/4] Waiting for PostgreSQL..."
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

# 4. Start all services
echo ""
echo "[4/4] Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "=== Setup Complete ==="
echo "API:            http://localhost:3000"
echo "GraphQL:        http://localhost:3000/graphql"
echo "Cognito Local:  http://localhost:9229"
echo "PostgreSQL:     localhost:5432"
echo "LocalStack:     http://localhost:4566"
echo ""
echo "User Pool ID:   local_2yovNmW0"
echo "Client ID:      418806fx3afm9cp1mdhxwpxw3"
