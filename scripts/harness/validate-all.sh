#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/lib.sh"
source "$script_dir/validate-knowledge.sh"
source "$script_dir/validate-architecture.sh"
source "$script_dir/score-quality.sh"
source "$script_dir/validate-mobile-knip.sh"

validate_all() {
  local root="${1:-$HARNESS_REPO_ROOT}" messages="" output status=0
  for validator in validate_knowledge validate_architecture score_quality validate_mobile_knip; do
    if output="$($validator "$root" 2>&1)"; then
      harness_append_messages messages "$output"
    else
      harness_append_messages messages "$output"
      status=1
    fi
  done
  printf '%s' "$messages"
  return "$status"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  messages=""
  if messages="$(validate_all "${1:-$HARNESS_REPO_ROOT}")"; then
    harness_exit_with_messages "$messages"
  else
    [[ -z "$messages" ]] || printf '%s\n' "$messages" >&2
    exit 1
  fi
fi
