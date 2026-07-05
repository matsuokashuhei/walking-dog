#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/lib.sh"

main() {
  harness_require_commands jq

  local root="$HARNESS_REPO_ROOT" run_root seed_path
  run_root="$root/.harness-runs"
  seed_path="$root/scripts/harness/fixtures/seed-data.json"

  mkdir -p "$run_root"
  rm -rf "$run_root/journeys"
  mkdir -p "$run_root/journeys"
  jq -n --arg resetAt "$(harness_iso_now)" --arg seedPath "$seed_path" '{resetAt:$resetAt,seedPath:$seedPath}' > "$run_root/last-reset.json"

  "$script_dir/dev-stack.sh" down

  echo "Harness local data reset. Dev stack containers and volumes removed. Seed fixture: $seed_path"
}

main "$@"
