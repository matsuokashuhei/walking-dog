#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

validate_architecture() {
  local root="${1:-$HARNESS_REPO_ROOT}"
  (
    cd "$root/apps/api"
    cargo xtask architecture check
  )
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  validate_architecture "${1:-$HARNESS_REPO_ROOT}"
fi
