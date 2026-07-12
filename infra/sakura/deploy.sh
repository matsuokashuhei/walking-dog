#!/bin/bash
# Deploy the Sakura stack: update tracked files, pull the API image, restart services.
set -euo pipefail

exported_ecr_image="${ECR_IMAGE-}"

cd "$(dirname "$0")"

# Load .env
set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -n "$exported_ecr_image" ]]; then
  ECR_IMAGE="$exported_ecr_image"
  export ECR_IMAGE
fi

if [[ ! "${ECR_IMAGE:-}" =~ ^[^[:space:]@]+@sha256:[0-9a-f]{64}$ ]]; then
  echo "ECR_IMAGE must be repository@sha256 followed by exactly 64 lowercase hex characters" >&2
  exit 2
fi

[[ "${DEPLOY_VALIDATE_ONLY:-}" == 1 ]] && exit 0

git pull --ff-only

# ECR login
AWS_ACCOUNT_ID=$(echo "$ECR_IMAGE" | cut -d. -f1)
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
      "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Pull the immutable image and (re)start services.
docker compose pull api worker
docker compose up -d --force-recreate

echo "Deploy complete."
