#!/usr/bin/env bash

HARNESS_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_REPO_ROOT="$(cd "$HARNESS_LIB_DIR/../.." && pwd)"

harness_require_commands() {
  local command_name
  for command_name in "$@"; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "missing required command: $command_name" >&2
      exit 2
    fi
  done
}

harness_rel() {
  local root="$1" path="$2"
  case "$path" in
    "$root"/*)
      printf '%s\n' "${path#"$root"/}"
      ;;
    *)
      printf '%s\n' "$path"
      ;;
  esac
}

harness_exit_with_messages() {
  local messages="$1"
  if [[ -n "$messages" ]]; then
    printf '%s\n' "$messages" >&2
    exit 1
  fi
  exit 0
}

harness_append_messages() {
  local target_name="$1" new_messages="$2" current
  [[ -n "$new_messages" ]] || return 0
  eval "current=\"\${$target_name:-}\""
  if [[ -n "$current" ]]; then
    printf -v "$target_name" '%s\n%s' "$current" "$new_messages"
  else
    printf -v "$target_name" '%s' "$new_messages"
  fi
}

harness_find_repo_files() {
  local root="$1" name_pattern="$2"
  [[ -d "$root" ]] || return 0
  find "$root" \
    \( -type d \( \
      -name .git -o \
      -name .claude -o \
      -name node_modules -o \
      -name target -o \
      -name ios -o \
      -name android -o \
      -name .harness-runs \
    \) -prune \) -o \
    -type f -name "$name_pattern" -print
}

harness_find_mobile_files() {
  local root="$1"
  [[ -d "$root/apps/mobile" ]] || return 0
  find "$root/apps/mobile" \
    \( -type d \( -name node_modules -o -name ios -o -name android \) -prune \) -o \
    -type f \( -name '*.ts' -o -name '*.tsx' \) -print
}

harness_strip_rust_test_modules() {
  local file="$1"
  awk '
    function count_open(text, copy) {
      copy = text
      return gsub(/\{/, "", copy)
    }
    function count_close(text, copy) {
      copy = text
      return gsub(/\}/, "", copy)
    }
    BEGIN {
      pending_cfg = 0
      skipping = 0
      depth = 0
    }
    skipping {
      depth += count_open($0)
      depth -= count_close($0)
      if (depth <= 0) {
        skipping = 0
      }
      next
    }
    /^[[:space:]]*#\[cfg\(test\)\][[:space:]]*$/ {
      pending_cfg = 1
      next
    }
    pending_cfg && /^[[:space:]]*mod[[:space:]]+tests[[:space:]]*\{/ {
      skipping = 1
      depth = count_open($0) - count_close($0)
      if (depth <= 0) {
        skipping = 0
      }
      pending_cfg = 0
      next
    }
    pending_cfg {
      print "#[cfg(test)]"
      pending_cfg = 0
    }
    {
      print
    }
  ' "$file"
}

harness_extract_first_match() {
  local file="$1" regex="$2"
  sed -nE "s/$regex/\\1/p" "$file" | head -n 1
}

harness_epoch_utc() {
  local value="$1" epoch
  if epoch="$(date -u -d "$value" '+%s' 2>/dev/null)"; then
    printf '%s\n' "$epoch"
    return 0
  fi
  if epoch="$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$value" '+%s' 2>/dev/null)"; then
    printf '%s\n' "$epoch"
    return 0
  fi
  return 1
}

harness_iso_now() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

harness_run_timestamp() {
  date -u '+%Y-%m-%dT%H-%M-%SZ'
}

harness_sha1() {
  local value="$1"
  printf '%s' "$value" | shasum | awk '{print $1}'
}
