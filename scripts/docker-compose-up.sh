#!/bin/zsh
set -eu

alias aws='docker run --rm -ti -v ~/.aws:/root/.aws -v $(pwd):/aws amazon/aws-cli'
aws sts get-caller-identity > /dev/null
if [ $? -ne 0 ]
then
  echo "AWS credentials are not available"
  exit 1
fi

aws configure export-credentials --format env-no-export > /dev/null
if [ $? -ne 0 ]
then
  echo "Failed to export AWS credentials"
  exit 1
fi
aws configure export-credentials --format env-no-export > apps/api/.env.aws

docker compose -f apps/compose.yml up
