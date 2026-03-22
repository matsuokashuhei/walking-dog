#!/usr/bin/env bash
# cognito-local DB からユーザーの確認コードを取得するスクリプト
#
# 使い方:
#   ./apps/e2e/scripts/get-confirmation-code.sh [email]
#
# 引数なし: 全ユーザーの確認コードを一覧表示
# 引数あり: 指定メールアドレスの確認コードのみ表示
#
# 例:
#   ./apps/e2e/scripts/get-confirmation-code.sh
#   ./apps/e2e/scripts/get-confirmation-code.sh test@example.com

set -euo pipefail

COMPOSE_FILE="apps/compose.yml"
USER_POOL_ID="local_2yovNmW0"
DB_PATH="/app/.cognito/db/${USER_POOL_ID}.json"
EMAIL_FILTER="${1:-}"

# リポジトリルートから実行されているか確認
if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: $COMPOSE_FILE が見つかりません。リポジトリルートから実行してください。" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec cognito-local sh -c "cat $DB_PATH" \
  | jq -r --arg filter "$EMAIL_FILTER" '
      .Users
      | to_entries[]
      | .value
      | {
          email: (.Attributes // [] | map(select(.Name == "email")) | first | .Value // "（不明）"),
          status: .UserStatus,
          code: (.ConfirmationCode // "（確認済みまたは未設定）")
        }
      | select($filter == "" or (.email | ascii_downcase | contains($filter | ascii_downcase)))
      | "Email:  \(.email)\nStatus: \(.status)\nCode:   \(.code)\n"
    '
