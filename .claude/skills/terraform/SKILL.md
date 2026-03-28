---
name: terraform
description: Run Terraform commands via Docker in this project. Use this skill whenever you need to run terraform init, plan, apply, destroy, output, or any other terraform CLI command. This project does NOT have Terraform installed locally — all terraform commands MUST go through Docker. Also use this skill when the user asks about infrastructure provisioning, AWS resource management, or IaC operations in this repo.
---

# Terraform via Docker

This project runs Terraform through the official Docker image (`hashicorp/terraform:1.14`). Never run `terraform` directly on the host.

## Base Command

```bash
docker run --rm \
  -v "$(pwd)/infra/aws:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=personal \
  -w /workspace \
  hashicorp/terraform:1.14 <command>
```

### What each flag does

| Flag | Purpose |
|------|---------|
| `-v "$(pwd)/infra/aws:/workspace"` | Mount the Terraform root module into the container |
| `-v "$HOME/.aws:/root/.aws:ro"` | Mount AWS credentials (read-only) for SSO auth |
| `-e AWS_PROFILE=personal` | Use the `personal` SSO profile |
| `-w /workspace` | Set working directory inside the container |

## Common Commands

### Initialize
```bash
docker run --rm -v "$(pwd)/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 init
```

### Plan
```bash
docker run --rm -v "$(pwd)/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 plan
```

### Apply
```bash
docker run --rm -v "$(pwd)/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 apply
```

### Destroy
```bash
docker run --rm -v "$(pwd)/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 destroy
```

### Output
```bash
docker run --rm -v "$(pwd)/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 output
```

### Output (sensitive value)
```bash
docker run --rm -v "$(pwd)/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 output -raw <output_name>
```

## State Backend (Bootstrap)

State は S3 に保存される。初回セットアップ時のみ bootstrap が必要：

```bash
# 1. bootstrap で S3 バケットを作成（ローカル state）
docker run --rm -v "$(pwd)/infra/aws/bootstrap:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 init
docker run --rm -v "$(pwd)/infra/aws/bootstrap:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 apply

# 2. メインの init で S3 backend に接続
docker run --rm -v "$(pwd)/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 init
```

## Prerequisites

AWS SSO login must be active before running any command that accesses AWS:

```bash
aws sso login --profile personal
```

## Adding Other Cloud Providers

The `infra/` directory is organized by provider. For a new provider (e.g., GCP):
- Create `infra/gcp/` with its own Terraform files
- Change the volume mount: `-v "$(pwd)/infra/gcp:/workspace"`
- Adjust credentials and environment variables accordingly
