#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

usage() {
  echo "Usage: scripts/harness/run-api-journey.sh <auth-onboarding|dog-profile|walk-goal|walk-lifecycle|walk-events-photo|walk-history-owner-contribution>" >&2
}

build_steps() {
  local journey="$1" now email otp_query user_query requires_auth
  now="$(date -u '+%s')"
  email="harness-$now@example.com"
  otp_query='mutation HarnessRequestOneTimePassword($input: RequestOneTimePasswordInput!) { requestOneTimePassword(input: $input) { email session } }'
  user_query='{ user { id } }'
  requires_auth=true

  case "$journey" in
    auth-onboarding)
      jq -n --arg otpQuery "$otp_query" --arg email "$email" '[
        {name:"schema-smoke", query:"{ __typename }"},
        {
          name:"request-one-time-password-contract",
          query:$otpQuery,
          variables:{input:{email:$email}}
        }
      ]'
      ;;
    walk-lifecycle)
      jq -n --arg userQuery "$user_query" --argjson requiresAuth "$requires_auth" '[
        {name:"schema-smoke", query:"{ __typename }"},
        {
          name:"user-query-contract",
          query:$userQuery,
          requiresAuth:$requiresAuth
        }
      ]'
      ;;
    *)
      jq -n '[{name:"schema-smoke", query:"{ __typename }"}]'
      ;;
  esac
}

graphql_request() {
  local api_url="$1" step_json="$2" payload body_file http_status curl_status body response_json
  body_file="$(mktemp)"
  payload="$(printf '%s' "$step_json" | jq -c '{query:.query, variables:(.variables // {})}')"

  set +e
  if [[ -n "${HARNESS_ACCESS_TOKEN:-}" ]]; then
    http_status="$(curl -sS -o "$body_file" -w '%{http_code}' \
      -X POST "$api_url" \
      -H 'content-type: application/json' \
      -H "authorization: Bearer $HARNESS_ACCESS_TOKEN" \
      -d "$payload" 2>&1)"
  else
    http_status="$(curl -sS -o "$body_file" -w '%{http_code}' \
      -X POST "$api_url" \
      -H 'content-type: application/json' \
      -d "$payload" 2>&1)"
  fi
  curl_status="$?"
  set -e

  body="$(cat "$body_file")"
  rm -f "$body_file"

  if [[ "$curl_status" -ne 0 ]]; then
    jq -n --arg message "$http_status" '{status:0, errors:[{message:$message}]}'
    return 0
  fi

  if response_json="$(printf '%s' "$body" | jq -c --argjson status "$http_status" '{status:$status} + .' 2>/dev/null)"; then
    printf '%s\n' "$response_json"
  else
    jq -n --argjson status "$http_status" --arg message "$body" '{status:$status, errors:[{message:$message}]}'
  fi
}

main() {
  harness_require_commands jq curl

  local root="$HARNESS_REPO_ROOT" journey="${1:-}" api_url steps_json run_dir results_file index
  local step_json name started_at finished_at response_json record_json step_file
  local valid_journey=false

  case "$journey" in
    auth-onboarding|dog-profile|walk-goal|walk-lifecycle|walk-events-photo|walk-history-owner-contribution)
      valid_journey=true
      ;;
  esac

  if [[ -z "$journey" || "$valid_journey" != true ]]; then
    usage
    exit 2
  fi

  api_url="${HARNESS_API_URL:-http://localhost:3000/graphql}"
  steps_json="$(build_steps "$journey")"

  if printf '%s' "$steps_json" | jq -e 'any(.[]; .requiresAuth == true)' >/dev/null && [[ -z "${HARNESS_ACCESS_TOKEN:-}" ]]; then
    echo "Journey $journey requires HARNESS_ACCESS_TOKEN. Set it to a real AWS Cognito access token before running this journey." >&2
    exit 2
  fi

  run_dir="$root/.harness-runs/journeys/$(harness_run_timestamp)-$journey"
  mkdir -p "$run_dir"
  results_file="$run_dir/results.tmp.json"
  printf '[]' > "$results_file"

  index=0
  while IFS= read -r step_json; do
    index=$((index + 1))
    name="$(printf '%s' "$step_json" | jq -r '.name')"
    started_at="$(harness_iso_now)"
    response_json="$(graphql_request "$api_url" "$step_json")"
    finished_at="$(harness_iso_now)"
    record_json="$(jq -n \
      --arg name "$name" \
      --arg startedAt "$started_at" \
      --arg finishedAt "$finished_at" \
      --argjson request "$step_json" \
      --argjson response "$response_json" \
      '{name:$name,startedAt:$startedAt,finishedAt:$finishedAt,request:$request,response:$response}')"
    step_file="$run_dir/$(printf '%02d' "$index")-$name.json"
    printf '%s\n' "$record_json" | jq '.' > "$step_file"
    jq --argjson record "$record_json" '. + [$record]' "$results_file" > "$results_file.next"
    mv "$results_file.next" "$results_file"

    if printf '%s' "$response_json" | jq -e '(.errors // []) | length > 0' >/dev/null; then
      jq -n --argjson results "$(cat "$results_file")" '{ok:false,results:$results}' > "$run_dir/result.json"
      rm -f "$results_file"
      echo "Journey $journey failed at step $name" >&2
      exit 1
    fi
  done < <(printf '%s' "$steps_json" | jq -c '.[]')

  jq -n --arg journey "$journey" --arg apiUrl "$api_url" --argjson results "$(cat "$results_file")" '{ok:true,journey:$journey,apiUrl:$apiUrl,results:$results}' > "$run_dir/result.json"
  rm -f "$results_file"
  echo "Journey $journey evidence written to $run_dir"
}

main "$@"
