#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

score_quality() {
  local root="${1:-$HARNESS_REPO_ROOT}" messages="" path plan date_part today_value today_epoch plan_epoch age_seconds
  local required_quality_docs=(
    "docs/harness/quality-score.md"
    "docs/harness/lessons-learned.md"
  )

  for path in "${required_quality_docs[@]}"; do
    if [[ ! -f "$root/$path" ]]; then
      harness_append_messages messages "missing required quality document: $path"
    fi
  done

  today_value="${HARNESS_TODAY:-$(harness_iso_now)}"
  today_epoch="$(harness_epoch_utc "$today_value")"

  if [[ -d "$root/docs/superpowers/plans" ]]; then
    while IFS= read -r plan; do
      date_part="$(basename "$plan" | sed -nE 's/^([0-9]{4}-[0-9]{2}-[0-9]{2})-.+\.md$/\1/p')"
      [[ -n "$date_part" ]] || continue
      plan_epoch="$(harness_epoch_utc "${date_part}T00:00:00Z")"
      age_seconds=$((today_epoch - plan_epoch))
      if [[ "$age_seconds" -gt 5184000 ]]; then
        harness_append_messages messages "old active plan should be completed or archived: $(harness_rel "$root" "$plan")"
      fi
    done < <(find "$root/docs/superpowers/plans" -type f -name '*.md' -print)
  fi

  printf '%s' "$messages"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  harness_exit_with_messages "$(score_quality "${1:-$HARNESS_REPO_ROOT}")"
fi
