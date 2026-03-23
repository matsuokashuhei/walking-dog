#!/usr/bin/env bash
# Reset cognito-local to seed state (removes all users)
# Usage: ./scripts/reset-cognito.sh
set -euo pipefail

COMPOSE_FILE="apps/compose.yml"
SEED_DIR="apps/cognito-local/seed"
DB_DIR="apps/cognito-local/db"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: Run this script from the repository root." >&2
  exit 1
fi

echo "Resetting cognito-local database to seed state..."
cp "$SEED_DIR"/local_2yovNmW0.json "$DB_DIR"/local_2yovNmW0.json
cp "$SEED_DIR"/clients.json "$DB_DIR"/clients.json
docker compose -f "$COMPOSE_FILE" restart cognito-local
echo "Done. Cognito-local restarted with empty user pool."
echo ""
echo "User Pool ID:   local_2yovNmW0"
echo "Client ID:      418806fx3afm9cp1mdhxwpxw3"
