#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
runtime_image="${1:?usage: verify-production-images.sh <locally-built-runtime-image>}"
digest="sha256:$(printf 'a%.0s' {1..64})"

"$root/scripts/harness/validate-image-pins.sh"
compose_fixture="$(mktemp -d)"
cp "$root/infra/sakura/compose.yml" "$compose_fixture/compose.yml"
touch "$compose_fixture/.env"

resolved="$(cd "$compose_fixture" && ECR_IMAGE="registry.invalid/api@$digest" POSTGRES_PASSWORD=test docker compose config)"
[[ "$resolved" == *'test: ["CMD-SHELL", "kill -0 1"]'* || "$resolved" == *'kill -0 1'* ]] || {
  echo "resolved worker healthcheck is not process liveness" >&2
  exit 1
}

name="walking-dog-worker-health-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$compose_fixture"; }
trap cleanup EXIT
docker run -d --name "$name" \
  --health-cmd='kill -0 1' --health-interval=1s --health-timeout=1s --health-retries=3 \
  -e API_BIND_ADDR=0.0.0.0:3000 \
  -e DATABASE_URL=postgres://postgres:test@localhost:5432/test \
  "$runtime_image" track-point-worker >/dev/null
for _attempt in $(seq 1 20); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$name")"
  [[ "$status" == healthy ]] && break
  sleep 1
done
[[ "$status" == healthy ]] || { echo "worker did not become healthy" >&2; exit 1; }
docker stop --time 10 "$name" >/dev/null
[[ "$(docker inspect -f '{{.State.ExitCode}}' "$name")" == 0 ]] || {
  echo "worker did not stop cleanly" >&2
  exit 1
}
