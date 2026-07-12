#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmpdirs=()

make_tmpdir() {
  local var_name="$1" created_tmpdir
  created_tmpdir="$(mktemp -d)"
  tmpdirs+=("$created_tmpdir")
  printf -v "$var_name" '%s' "$created_tmpdir"
}

cleanup_tmpdirs() {
  ((${#tmpdirs[@]} == 0)) || rm -rf "${tmpdirs[@]}"
}

trap cleanup_tmpdirs EXIT

fail() {
  echo "not ok - $1" >&2
  exit 1
}

assert_contains() {
  local haystack="$1" needle="$2" message="$3"
  [[ "$haystack" == *"$needle"* ]] || fail "$message"
}

assert_not_contains() {
  local haystack="$1" needle="$2" message="$3"
  [[ "$haystack" != *"$needle"* ]] || fail "$message"
}

write_file() {
  local root="$1" path="$2" content="$3"
  mkdir -p "$(dirname "$root/$path")"
  printf '%s' "$content" > "$root/$path"
}

write_complete_knowledge_fixture() {
  local root="$1" axis_content
  axis_content=$'# Journey\n犬の体験\nデータによる散歩の最大化\n飼い主の貢献心\n'

  write_file "$root" "AGENTS.md" $'# Agents\n- [Harness](docs/harness/README.md)\n- [Quality](docs/harness/quality-score.md)\n'
  write_file "$root" "CLAUDE.md" $'# Compatibility\n\nSee [AGENTS.md](AGENTS.md).\n'
  write_file "$root" "docs/harness/README.md" $'# Harness\n'
  write_file "$root" "docs/product/principles.md" $'# Product\n'
  write_file "$root" "docs/harness/domain-rules.md" $'# Domain\n'
  write_file "$root" "docs/architecture/harness-first-development.md" $'# Architecture\n'
  write_file "$root" "docs/runbooks/local-harness.md" $'# Runbook\n'
  write_file "$root" "docs/harness/quality-score.md" $'# Quality Score\n'
  write_file "$root" "docs/harness/lessons-learned.md" $'# Lessons Learned\n'
  write_file "$root" "docs/harness/journeys/auth-onboarding.md" "$axis_content"
  write_file "$root" "docs/harness/journeys/dog-profile.md" "$axis_content"
  write_file "$root" "docs/harness/journeys/walk-goal.md" "$axis_content"
  write_file "$root" "docs/harness/journeys/walk-lifecycle.md" "$axis_content"
  write_file "$root" "docs/harness/journeys/walk-events-photo.md" "$axis_content"
  write_file "$root" "docs/harness/journeys/walk-history-owner-contribution.md" "$axis_content"
}

run_script_expect_status() {
  local expected_status="$1"
  shift
  local output status
  set +e
  output="$("$@" 2>&1)"
  status="$?"
  set -e
  [[ "$status" -eq "$expected_status" ]] || fail "expected status $expected_status from $*; got $status output=$output"
  printf '%s' "$output"
}

test_validate_knowledge_reports_missing_local_markdown_links() {
  local tmpdir output
  make_tmpdir tmpdir
  write_file "$tmpdir" "AGENTS.md" $'# Agents\n\n- [Missing](docs/missing.md)\n'
  write_file "$tmpdir" "docs/harness/index.md" $'# Harness\n'
  write_file "$tmpdir" "docs/harness/journeys/walk-lifecycle.md" $'# Walk Lifecycle\n- 犬の体験: yes\n- データによる散歩の最大化: yes\n- 飼い主の貢献心: yes\n'

  output="$(run_script_expect_status 1 "$repo_root/scripts/harness/validate-knowledge.sh" "$tmpdir")"

  assert_contains "$output" "missing local link" "expected missing local link message"
  assert_contains "$output" "docs/missing.md" "expected missing markdown target in output"
}

test_validate_knowledge_accepts_complete_fixture() {
  local tmpdir output
  make_tmpdir tmpdir
  write_complete_knowledge_fixture "$tmpdir"

  output="$(run_script_expect_status 0 "$repo_root/scripts/harness/validate-knowledge.sh" "$tmpdir")"

  [[ -z "$output" ]] || fail "expected no output from passing knowledge validation; got $output"
}

test_validate_architecture_delegates_to_canonical_xtask_check() {
  local tmpdir output cargo_log
  make_tmpdir tmpdir
  cargo_log="$tmpdir/cargo.log"
  mkdir -p "$tmpdir/apps/api" "$tmpdir/bin"
  write_file "$tmpdir" "bin/cargo" $'#!/usr/bin/env bash\nprintf "%s\n" "$PWD" > "$HARNESS_CARGO_LOG"\nprintf "%s " "$@" >> "$HARNESS_CARGO_LOG"\n'
  chmod +x "$tmpdir/bin/cargo"

  output="$(HARNESS_CARGO_LOG="$cargo_log" PATH="$tmpdir/bin:$PATH" run_script_expect_status 0 "$repo_root/scripts/harness/validate-architecture.sh" "$tmpdir")"

  [[ -z "$output" ]] || fail "expected no output from canonical architecture validation; got $output"
  assert_contains "$(cat "$cargo_log")" "$tmpdir/apps/api" "expected architecture check to run in API workspace"
  assert_contains "$(cat "$cargo_log")" "xtask architecture check" "expected canonical architecture command"
}

test_score_quality_flags_stale_plans_and_missing_docs() {
  local tmpdir output
  make_tmpdir tmpdir
  mkdir -p "$tmpdir/docs/superpowers/plans"
  write_file "$tmpdir" "docs/superpowers/plans/2025-01-01-old.md" $'# Old\n'

  output="$(HARNESS_TODAY=2026-06-13T00:00:00Z run_script_expect_status 1 "$repo_root/scripts/harness/score-quality.sh" "$tmpdir")"

  assert_contains "$output" "missing required quality document" "expected missing quality doc message"
  assert_contains "$output" "old active plan" "expected stale plan message"
}

test_run_api_journey_uses_current_user_query() {
  local source
  source="$(cat "$repo_root/scripts/harness/run-api-journey.sh")"

  assert_contains "$source" "'{ user { id } }'" "expected walk-lifecycle user query"
  assert_not_contains "$source" "{ me { id } }" "did not expect old me query"
}

test_authenticated_api_journeys_fail_fast_without_token() {
  local source output
  source="$(cat "$repo_root/scripts/harness/run-api-journey.sh")"

  assert_contains "$source" "requires_auth=true" "expected authenticated journey marker"
  assert_contains "$source" "HARNESS_ACCESS_TOKEN" "expected token guard"
  assert_contains "$source" "real AWS Cognito access token" "expected real Cognito guidance"
  assert_not_contains "$source" "local-auth" "did not expect local auth fallback"

  output="$(run_script_expect_status 2 "$repo_root/scripts/harness/run-api-journey.sh" walk-lifecycle)"
  assert_contains "$output" "requires HARNESS_ACCESS_TOKEN" "expected missing token to fail fast"
}

test_auth_onboarding_starts_unified_email_one_time_password_auth() {
  local source
  source="$(cat "$repo_root/scripts/harness/run-api-journey.sh")"

  assert_contains "$source" 'mutation HarnessRequestOneTimePassword($input: RequestOneTimePasswordInput!)' "expected OTP mutation"
  assert_contains "$source" 'requestOneTimePassword(input: $input)' "expected requestOneTimePassword call"
  assert_contains "$source" "session" "expected session in contract"
  assert_not_contains "$source" "displayName" "did not expect displayName"
  assert_not_contains "$source" "purpose" "did not expect purpose"
  assert_not_contains "$source" "password:" "did not expect password"
}

test_validate_mobile_knip_runs_knip_in_mobile_workspace() {
  local tmpdir output npm_log
  make_tmpdir tmpdir
  npm_log="$tmpdir/npm.log"
  mkdir -p "$tmpdir/apps/mobile" "$tmpdir/bin"
  write_file "$tmpdir" "apps/mobile/package.json" '{"scripts":{"knip":"knip"}}'
  write_file "$tmpdir" "bin/npm" $'#!/usr/bin/env bash\nprintf "%s\\n" "$PWD" > "$HARNESS_NPM_LOG"\nprintf "%s " "$@" >> "$HARNESS_NPM_LOG"\n'
  chmod +x "$tmpdir/bin/npm"

  output="$(HARNESS_NPM_LOG="$npm_log" PATH="$tmpdir/bin:$PATH" run_script_expect_status 0 "$repo_root/scripts/harness/validate-mobile-knip.sh" "$tmpdir")"

  [[ -z "$output" ]] || fail "expected no output from passing mobile Knip validation; got $output"
  assert_contains "$(cat "$npm_log")" "$tmpdir/apps/mobile" "expected Knip to run from apps/mobile"
  assert_contains "$(cat "$npm_log")" "run knip -- --no-progress" "expected npm run knip command"
}

test_validate_mobile_knip_reports_knip_failures() {
  local tmpdir output
  make_tmpdir tmpdir
  mkdir -p "$tmpdir/apps/mobile" "$tmpdir/bin"
  write_file "$tmpdir" "apps/mobile/package.json" '{"scripts":{"knip":"knip"}}'
  write_file "$tmpdir" "bin/npm" $'#!/usr/bin/env bash\necho "Unused files (1)" >&2\necho "components/Unused.tsx" >&2\nexit 1\n'
  chmod +x "$tmpdir/bin/npm"

  output="$(PATH="$tmpdir/bin:$PATH" run_script_expect_status 1 "$repo_root/scripts/harness/validate-mobile-knip.sh" "$tmpdir")"

  assert_contains "$output" "mobile Knip validation failed" "expected Knip failure context"
  assert_contains "$output" "Unused files (1)" "expected Knip output"
  assert_contains "$output" "components/Unused.tsx" "expected Knip issue details"
}

test_validate_all_includes_mobile_knip_gate() {
  local source
  source="$(cat "$repo_root/scripts/harness/validate-all.sh")"

  assert_contains "$source" "validate-mobile-knip.sh" "expected validate-all to source mobile Knip validator"
  assert_contains "$source" "validate_mobile_knip" "expected validate-all to run mobile Knip validator"
}

test_validate_all_propagates_validator_failure() {
  local source
  source="$(cat "$repo_root/scripts/harness/validate-all.sh")"

  assert_contains "$source" 'status=0' "expected aggregate status tracking"
  assert_contains "$source" 'status=1' "expected failed validator to fail validate-all"
  assert_contains "$source" 'return "$status"' "expected aggregate status propagation"
}

test_harness_has_no_node_scripts_or_invocations() {
  local matches pattern
  matches="$(find "$repo_root/scripts/harness" -maxdepth 1 \( -name '*.mjs' -o -name '*.test.mjs' \) -print)"
  [[ -z "$matches" ]] || fail "expected no harness .mjs files; found $matches"

  pattern="node scripts/"'harness|node --test scripts/'"harness|scripts/"'harness/[a-z-]+\.mjs|node -'"p"
  matches="$(cd "$repo_root" && rg --hidden --no-ignore -n "$pattern" .codex .github AGENTS.md CLAUDE.md docs scripts infra apps/mobile/e2e/maestro || true)"
  [[ -z "$matches" ]] || fail "expected no Node harness references; found $matches"
}

main() {
  local test_name
  for test_name in $(declare -F | awk '{print $3}' | grep '^test_'); do
    "$test_name"
    echo "ok - $test_name"
  done
}

main "$@"
