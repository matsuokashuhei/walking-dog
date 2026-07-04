#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

validate_architecture() {
  local root="${1:-$HARNESS_REPO_ROOT}" messages="" dir file content api_path mobile_path api mobile
  local api_min api_max mobile_min mobile_max worker_path
  local resolver_dirs=(
    "apps/api/src/graphql/mutation"
    "apps/api/src/graphql/query"
    "apps/api/src/graphql/object"
  )

  for dir in "${resolver_dirs[@]}"; do
    [[ -d "$root/$dir" ]] || continue
    while IFS= read -r file; do
      content="$(harness_strip_rust_test_modules "$file")"
      if printf '%s\n' "$content" | grep -Eq '(^|[^[:alnum:]_])aws_sdk_[a-z0-9_]+'; then
        harness_append_messages messages "GraphQL resolver boundary violation in $(harness_rel "$root" "$file"): AWS SDK belongs behind service gateways"
      fi
      if printf '%s\n' "$content" | grep -Eq '(^|[^[:alnum:]_])AttributeValue([^[:alnum:]_]|$)'; then
        harness_append_messages messages "GraphQL resolver boundary violation in $(harness_rel "$root" "$file"): DynamoDB item shape belongs behind TrackPointRepository"
      fi
      if printf '%s\n' "$content" | grep -Eq '(^|[^[:alnum:]_:])(std::env::var|env::var)([^[:alnum:]_]|$)'; then
        harness_append_messages messages "GraphQL resolver boundary violation in $(harness_rel "$root" "$file"): resolver env access belongs behind service/config builders"
      fi
      if printf '%s\n' "$content" | grep -Eq '(^|[^[:alnum:]_])(S3[A-Za-z]*Gateway|DynamoDb[A-Za-z]*Repository)([^[:alnum:]_]|$)'; then
        harness_append_messages messages "GraphQL resolver boundary violation in $(harness_rel "$root" "$file"): resolvers should depend on shared service contracts, not concrete storage clients"
      fi
    done < <(find "$root/$dir" -type f -name '*.rs' -print)
  done

  while IFS= read -r file; do
    content="$(cat "$file")"
    if [[ "$content" == *"from '@react-navigation/"* || "$content" == *'from "@react-navigation/'* ]]; then
      harness_append_messages messages "mobile navigation boundary violation in $(harness_rel "$root" "$file"): import navigation APIs from expo-router"
    fi
  done < <(harness_find_mobile_files "$root")

  api_path="$root/apps/api/src/service/dog_walk_goal.rs"
  mobile_path="$root/apps/mobile/constants/walk.ts"
  if [[ ! -f "$api_path" || ! -f "$mobile_path" ]]; then
    harness_append_messages messages "walk goal minute bounds contract files are missing"
  else
    api_min="$(harness_extract_first_match "$api_path" '.*MIN_DAILY_GOAL_MINUTES:[[:space:]]*i32[[:space:]]*=[[:space:]]*([0-9]+).*')"
    api_max="$(harness_extract_first_match "$api_path" '.*MAX_DAILY_GOAL_MINUTES:[[:space:]]*i32[[:space:]]*=[[:space:]]*([0-9]+).*')"
    mobile_min="$(harness_extract_first_match "$mobile_path" '.*MIN_DAILY_GOAL_MINUTES[[:space:]]*=[[:space:]]*([0-9]+).*')"
    mobile_max="$(harness_extract_first_match "$mobile_path" '.*MAX_DAILY_GOAL_MINUTES[[:space:]]*=[[:space:]]*([0-9]+).*')"
    if [[ -z "$api_min" || -z "$api_max" || -z "$mobile_min" || -z "$mobile_max" ]]; then
      harness_append_messages messages "walk goal minute bounds drift: could not parse API/Mobile constants"
    elif [[ "$api_min" != "$mobile_min" || "$api_max" != "$mobile_max" ]]; then
      harness_append_messages messages "walk goal minute bounds drift: API $api_min-$api_max, Mobile $mobile_min-$mobile_max"
    fi
  fi

  worker_path="$root/apps/api/src/bin/track_point_worker.rs"
  if [[ -f "$worker_path" ]]; then
    content="$(harness_strip_rust_test_modules "$worker_path")"
    if printf '%s\n' "$content" | grep -Eq '(^|[^[:alnum:]_])struct[[:space:]]+WorkerRuntimeConfig([^[:alnum:]_]|$)|(^|[^[:alnum:]_])impl[[:space:]]+WorkerRuntimeConfig([^[:alnum:]_]|$)|(^|[^[:alnum:]_])fn[[:space:]]+[a-z0-9_]*env[a-z0-9_]*value([^[:alnum:]_]|$)|(^|[^[:alnum:]_])warn_invalid_env_value([^[:alnum:]_]|$)'; then
      harness_append_messages messages "apps/api/src/bin/track_point_worker.rs: track point worker env config should read env/defaults directly at the ConsumerOptions call site; avoid wrapper structs and custom validation fallback helpers"
    fi
  fi

  printf '%s' "$messages"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  harness_exit_with_messages "$(validate_architecture "${1:-$HARNESS_REPO_ROOT}")"
fi
