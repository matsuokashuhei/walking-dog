#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

on_error() {
  local status="$?"
  echo "[sonar] command failed near line $1 with exit code $status" >&2
  exit "$status"
}

trap 'on_error "$LINENO"' ERR

strip_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "$value"
}

load_local_env() {
  local env_path="$root/scripts/sonar/local.env"
  [[ -f "$env_path" ]] || return 0

  local raw_line line key value
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    line="${raw_line%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue

    key="${line%%=*}"
    value="$(strip_quotes "${line#*=}")"
    case "$key" in
      SONAR_HOST_URL)
        if [[ -z "${SONAR_HOST_URL:-}" ]]; then
          export SONAR_HOST_URL="$value"
        fi
        ;;
      SONAR_TOKEN)
        if [[ -z "${SONAR_TOKEN:-}" ]]; then
          export SONAR_TOKEN="$value"
        fi
        ;;
    esac
  done < "$env_path"
}

require_sonar_env() {
  local key
  for key in SONAR_HOST_URL SONAR_TOKEN; do
    if [[ -z "${!key:-}" ]]; then
      echo "[sonar] Missing $key. Set SONAR_HOST_URL and SONAR_TOKEN in the environment or scripts/sonar/local.env before running Sonar analysis." >&2
      exit 1
    fi
  done
}

scanner_host_url() {
  local url="$1"
  url="${url/localhost/host.docker.internal}"
  url="${url/127.0.0.1/host.docker.internal}"
  printf '%s' "$url"
}

load_local_env
require_sonar_env

report_dir="$root/.sonar/reports"
cache_dir="$root/.sonar/cache"
mkdir -p "$report_dir" "$cache_dir"
raw_clippy_report="$report_dir/api-clippy.raw.json"

node scripts/harness/validate-all.mjs
docker build --target sonar -t apps-api-sonar -f apps/api/Dockerfile apps

docker run \
  --rm \
  -v "$root:/walking-dog" \
  -v apps_cargo_registry_sonar:/usr/local/cargo/registry \
  -v apps_cargo_git_sonar:/usr/local/cargo/git \
  -v apps_api_target_sonar:/tmp/walking-dog-target \
  -w /walking-dog/apps/api \
  apps-api-sonar \
  cargo clippy \
  --target-dir /tmp/walking-dog-target \
  --workspace \
  --all-targets \
  --features test-utils \
  --message-format=json \
  > "$raw_clippy_report"

scripts/sonar/normalize-clippy-report.sh \
  "$raw_clippy_report" \
  "$report_dir/api-clippy.json"

docker run \
  --rm \
  -e CARGO_TARGET_DIR=/tmp/walking-dog-target \
  -v "$root:/walking-dog" \
  -v apps_cargo_registry_sonar:/usr/local/cargo/registry \
  -v apps_cargo_git_sonar:/usr/local/cargo/git \
  -v apps_api_target_sonar:/tmp/walking-dog-target \
  -w /walking-dog/apps/api \
  apps-api-sonar \
  cargo llvm-cov \
  -p walking-dog \
  --lib \
  --tests \
  --features test-utils \
  -j 1 \
  --lcov \
  --output-path /walking-dog/.sonar/reports/api-lcov.info

scripts/sonar/lcov-to-generic-coverage.sh \
  --strip-prefix /walking-dog/ \
  "$report_dir/api-lcov.info" \
  "$report_dir/api-coverage.xml"

(
  cd apps/mobile
  npm run test:coverage
)

docker run \
  --rm \
  -e "SONAR_HOST_URL=$(scanner_host_url "$SONAR_HOST_URL")" \
  -e "SONAR_TOKEN=$SONAR_TOKEN" \
  -v "$root:/usr/src" \
  -v "$cache_dir:/opt/sonar-scanner/.sonar/cache" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=infra/sonarqube/sonar-project.properties
