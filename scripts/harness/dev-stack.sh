#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

make_project_name() {
  local path="$1" hash base safe_base
  hash="$(harness_sha1 "$path")"
  base="$(basename "$path")"
  safe_base="$(printf '%s' "$base" | sed -E 's/[^a-zA-Z0-9]/_/g' | tr '[:upper:]' '[:lower:]')"
  printf 'walking_dog_%s_%s\n' "$safe_base" "${hash:0:8}"
}

make_ports_json() {
  local path="$1" hash_prefix hash_number offset
  hash_prefix="${2:-$(harness_sha1 "$path")}"
  hash_prefix="${hash_prefix:0:4}"
  hash_number=$((16#$hash_prefix))
  offset=$((hash_number % 3000))
  jq -n \
    --argjson api "$((3000 + offset))" \
    --argjson postgres "$((5432 + offset))" \
    --argjson dynamodb "$((8000 + offset))" \
    --argjson minio "$((9000 + offset))" \
    --argjson minioConsole "$((9001 + offset))" \
    --argjson elasticmq "$((9324 + offset))" \
    --argjson elasticmqUi "$((9325 + offset))" \
    '{api:$api,postgres:$postgres,dynamodb:$dynamodb,minio:$minio,minioConsole:$minioConsole,elasticmq:$elasticmq,elasticmqUi:$elasticmqUi}'
}

print_help() {
  local project_name="$1" ports_json="$2"
  cat <<EOF
walking-dog harness dev stack

Usage:
  scripts/harness/dev-stack.sh up
  scripts/harness/dev-stack.sh down
  scripts/harness/dev-stack.sh status
  scripts/harness/dev-stack.sh logs

Project: $project_name
Ports: $(printf '%s' "$ports_json" | jq -c '.')

Note: down removes the harness containers, networks, and named volumes for this
worktree.
EOF
}

main() {
  harness_require_commands jq shasum

  local root="$HARNESS_REPO_ROOT" command="${1:-help}" run_root project_name ports_json
  local api_port postgres_port dynamodb_port minio_port minio_console_port elasticmq_port elasticmq_ui_port
  local compose_args=()

  run_root="$root/.harness-runs/dev-stack"
  project_name="$(make_project_name "$root")"
  ports_json="$(make_ports_json "$root")"

  mkdir -p "$run_root"
  jq -n --arg projectName "$project_name" --argjson ports "$ports_json" '{projectName:$projectName,ports:$ports}' > "$run_root/env.json"

  if [[ "$command" == "help" || "$command" == "--help" || "$command" == "-h" ]]; then
    print_help "$project_name" "$ports_json"
    return 0
  fi

  case "$command" in
    up)
      compose_args=(up -d postgres dynamodb-local minio minio-init elasticmq api track-point-worker)
      ;;
    down)
      compose_args=(down --volumes --remove-orphans)
      ;;
    status)
      compose_args=(ps)
      ;;
    logs)
      compose_args=(logs --tail=200)
      ;;
    *)
      echo "Unknown harness dev-stack command: $command" >&2
      print_help "$project_name" "$ports_json"
      exit 2
      ;;
  esac

  harness_require_commands docker

  api_port="$(printf '%s' "$ports_json" | jq -r '.api')"
  postgres_port="$(printf '%s' "$ports_json" | jq -r '.postgres')"
  dynamodb_port="$(printf '%s' "$ports_json" | jq -r '.dynamodb')"
  minio_port="$(printf '%s' "$ports_json" | jq -r '.minio')"
  minio_console_port="$(printf '%s' "$ports_json" | jq -r '.minioConsole')"
  elasticmq_port="$(printf '%s' "$ports_json" | jq -r '.elasticmq')"
  elasticmq_ui_port="$(printf '%s' "$ports_json" | jq -r '.elasticmqUi')"

  (
    cd "$root"
    WD_API_PORT="$api_port" \
      WD_POSTGRES_PORT="$postgres_port" \
      WD_DYNAMODB_PORT="$dynamodb_port" \
      WD_MINIO_PORT="$minio_port" \
      WD_MINIO_CONSOLE_PORT="$minio_console_port" \
      WD_ELASTICMQ_PORT="$elasticmq_port" \
      WD_ELASTICMQ_UI_PORT="$elasticmq_ui_port" \
      docker compose -p "$project_name" -f apps/compose.yml "${compose_args[@]}"
  )
}

main "$@"
