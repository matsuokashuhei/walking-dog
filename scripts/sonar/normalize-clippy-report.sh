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
  -e 's#("file_name"[[:space:]]*:[[:space:]]*")(crates|tools)/#\1apps/api/\2/#g' \
  -e 's#(--\> )(crates|tools)/#\1apps/api/\2/#g' \
  "$input_path" > "$tmp_path"

mv "$tmp_path" "$output_path"
