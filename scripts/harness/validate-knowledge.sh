#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

validate_knowledge() {
  local root="${1:-$HARNESS_REPO_ROOT}" messages="" agents_path claude_path line_count path full_path content axis
  local markdown_file link raw_target target resolved dir
  local required_docs=(
    "docs/harness/README.md"
    "docs/product/principles.md"
    "docs/harness/domain-rules.md"
    "docs/architecture/harness-first-development.md"
    "docs/runbooks/local-harness.md"
    "docs/harness/quality-score.md"
    "docs/harness/lessons-learned.md"
    "docs/harness/journeys/auth-onboarding.md"
    "docs/harness/journeys/dog-profile.md"
    "docs/harness/journeys/walk-goal.md"
    "docs/harness/journeys/walk-lifecycle.md"
    "docs/harness/journeys/walk-events-photo.md"
    "docs/harness/journeys/walk-history-owner-contribution.md"
  )
  local required_axes=("犬の体験" "データによる散歩の最大化" "飼い主の貢献心")

  agents_path="$root/AGENTS.md"
  claude_path="$root/CLAUDE.md"

  if [[ ! -f "$agents_path" ]]; then
    harness_append_messages messages "missing AGENTS.md"
  else
    line_count="$(wc -l < "$agents_path" | tr -d ' ')"
    if [[ "$line_count" -gt 130 ]]; then
      harness_append_messages messages "AGENTS.md must stay compact as a table of contents; found $line_count lines"
    fi
  fi

  if [[ ! -f "$claude_path" ]]; then
    harness_append_messages messages "missing CLAUDE.md compatibility entrypoint"
  fi

  for path in "${required_docs[@]}"; do
    if [[ ! -f "$root/$path" ]]; then
      harness_append_messages messages "missing required knowledge document: $path"
    fi
  done

  for path in "${required_docs[@]}"; do
    [[ "$path" == *"/journeys/"* ]] || continue
    full_path="$root/$path"
    [[ -f "$full_path" ]] || continue
    content="$(cat "$full_path")"
    for axis in "${required_axes[@]}"; do
      if [[ "$content" != *"$axis"* ]]; then
        harness_append_messages messages "$path is missing product axis: $axis"
      fi
    done
  done

  while IFS= read -r markdown_file; do
    while IFS= read -r link; do
      raw_target="$(printf '%s\n' "$link" | sed -E 's/^.*\(([^)]*)\)$/\1/')"
      raw_target="$(printf '%s' "$raw_target" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
      case "$raw_target" in
        http://*|https://*|mailto:*|\#*)
          continue
          ;;
      esac
      target="${raw_target%%#*}"
      [[ -n "$target" ]] || continue
      if [[ "$target" == \<*\> ]]; then
        target="${target#<}"
        target="${target%>}"
      fi
      dir="$(dirname "$markdown_file")"
      resolved="$dir/$target"
      if [[ ! -e "$resolved" ]]; then
        harness_append_messages messages "$(harness_rel "$root" "$markdown_file") has missing local link: $raw_target"
      fi
    done < <(grep -Eo '\[[^]]+\]\([^)]+\)' "$markdown_file" || true)
  done < <(harness_find_repo_files "$root" '*.md')

  printf '%s' "$messages"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  harness_exit_with_messages "$(validate_knowledge "${1:-$HARNESS_REPO_ROOT}")"
fi
