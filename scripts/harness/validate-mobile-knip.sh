#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

run_mobile_knip() {
  local mobile_dir="$1"

  if command -v npm >/dev/null 2>&1; then
    cd "$mobile_dir" && npm run knip -- --no-progress
    return "$?"
  fi

  if command -v zsh >/dev/null 2>&1; then
    cd "$mobile_dir" && zsh -lc 'npm run knip -- --no-progress'
    return "$?"
  fi

  echo "missing required command: npm" >&2
  return 127
}

validate_mobile_knip() {
  local root="${1:-$HARNESS_REPO_ROOT}" mobile_dir output status messages=""
  mobile_dir="$root/apps/mobile"

  if [[ ! -f "$mobile_dir/package.json" ]]; then
    harness_append_messages messages "mobile Knip validation failed: missing apps/mobile/package.json"
    printf '%s' "$messages"
    return 0
  fi

  set +e
  output="$(run_mobile_knip "$mobile_dir" 2>&1)"
  status="$?"
  set -e

  if [[ "$status" -ne 0 ]]; then
    harness_append_messages messages "mobile Knip validation failed:"
    harness_append_messages messages "$output"
  fi

  printf '%s' "$messages"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  harness_exit_with_messages "$(validate_mobile_knip "${1:-$HARNESS_REPO_ROOT}")"
fi
