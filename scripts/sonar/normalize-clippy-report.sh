#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "Usage: scripts/sonar/normalize-clippy-report.sh <input.json> <output.json>" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 2
fi

input_path="$1"
output_path="$2"
tmp_path="${output_path}.tmp.$$"

cleanup() {
  rm -f "$tmp_path"
}

trap cleanup EXIT

sed -E \
  -e 's#("file_name"[[:space:]]*:[[:space:]]*")src/#\1apps/api/src/#g' \
  -e 's#("file_name"[[:space:]]*:[[:space:]]*")tests/#\1apps/api/tests/#g' \
  -e 's#(--\> )src/#\1apps/api/src/#g' \
  -e 's#(--\> )tests/#\1apps/api/tests/#g' \
  "$input_path" > "$tmp_path"

mv "$tmp_path" "$output_path"
