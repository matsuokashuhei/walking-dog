#!/bin/bash
# Deploy the API on Sakura VPS: log into ECR, pull latest image, restart services.
set -euo pipefail

cd "$(dirname "$0")"

# Load .env
set -a
# shellcheck disable=SC1091
source .env
set +a

# ECR login
AWS_ACCOUNT_ID=$(echo "$ECR_IMAGE" | cut -d. -f1)
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
      "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Pull latest image and (re)start services.
docker compose pull api
docker compose up -d

echo "Deploy complete."
