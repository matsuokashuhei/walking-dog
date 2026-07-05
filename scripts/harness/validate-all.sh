#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/lib.sh"
source "$script_dir/validate-knowledge.sh"
source "$script_dir/validate-architecture.sh"
source "$script_dir/score-quality.sh"
source "$script_dir/validate-mobile-knip.sh"

validate_all() {
  local root="${1:-$HARNESS_REPO_ROOT}" messages=""
  harness_append_messages messages "$(validate_knowledge "$root")"
  harness_append_messages messages "$(validate_architecture "$root")"
  harness_append_messages messages "$(score_quality "$root")"
  harness_append_messages messages "$(validate_mobile_knip "$root")"
  printf '%s' "$messages"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  harness_exit_with_messages "$(validate_all "${1:-$HARNESS_REPO_ROOT}")"
fi
