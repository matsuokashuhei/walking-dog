#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

validate_change_manifest_history() {
  local root="${1:-$(cd "$script_dir/../.." && pwd)}"
  (
    cd "$root"
    node "$root/scripts/development/validate-change-manifest.mjs" --history
  )
}

validate_change_manifest_pr() {
  local root="$1" base="$2" head="$3" pr_body="$4"
  (
    cd "$root"
    node "$root/scripts/development/validate-change-manifest.mjs" \
      --base "$base" --head "$head" --pr-body "$pr_body" --require-pr-evidence
  )
}

# Ordinary local and main-branch Harness validation checks every stored record.
validate_change_manifest() {
  validate_change_manifest_history "${1:-$(cd "$script_dir/../.." && pwd)}"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  if [[ "${1:-}" == "--pr" ]]; then
    shift
    validate_change_manifest_pr "$@"
  else
    validate_change_manifest_history "${1:-$(cd "$script_dir/../.." && pwd)}"
  fi
fi
