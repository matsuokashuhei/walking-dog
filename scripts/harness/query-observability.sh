#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

main() {
  harness_require_commands jq

  local root="$HARNESS_REPO_ROOT" query journey_root note matches_file file
  query="$*"
  query="$(printf '%s' "$query" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  journey_root="$root/.harness-runs/journeys"
  note="Local OpenTelemetry backend queries should be added here when infra/observability is running."

  if [[ -z "$query" ]]; then
    echo "Usage: scripts/harness/query-observability.sh <walk-id|operation|error text>" >&2
    exit 2
  fi

  matches_file="$(mktemp)"
  if [[ -d "$journey_root" ]]; then
    while IFS= read -r file; do
      if grep -Fq "$query" "$file"; then
        printf '%s\n' "$file" >> "$matches_file"
      fi
    done < <(find "$journey_root" -type f -name '*.json' -print)
  fi

  jq -Rn --arg query "$query" --arg note "$note" '{query:$query,matches:[inputs],note:$note}' < "$matches_file"
  rm -f "$matches_file"
}

main "$@"
