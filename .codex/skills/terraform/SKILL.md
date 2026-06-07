---
name: terraform
description: Use when Codex needs to run Terraform CLI commands in this repo, including init, fmt, validate, plan, apply, destroy, output, import, state, or infrastructure/AWS/IaC work under infra/. The host does not have Terraform installed; run Terraform only through Docker with hashicorp/terraform:1.14.
---

# Terraform via Docker

## Core Rule

Run Terraform through the official Docker image. Do not run `terraform` directly on the host, and do not replace Terraform failures with fallbacks or ignored errors.

Default scope is the AWS root module at `infra/aws`. Run commands from the repo root unless the user explicitly asks for another module.

## Base Command

Use this shape for every Terraform command:

```bash
docker run --rm \
  -v "$PWD/infra/aws:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=personal \
  -w /workspace \
  hashicorp/terraform:1.14 <terraform-args>
```

If sandboxing, Docker daemon access, network access, or AWS credentials block an operation, rerun the same Docker-based command with Codex escalation and ask the user to approve it. Do not switch to host Terraform.

## Common Commands

```bash
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 init
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 fmt -recursive
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 validate
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 plan
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 output
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 output -raw <output_name>
```

Before running live-changing commands such as `apply`, `destroy`, `import`, `state rm`, or `force-unlock`, confirm intent unless the user's request explicitly authorizes that exact action.

```bash
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 apply
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 destroy
```

## AWS SSO

AWS SSO must be active for commands that access AWS:

```bash
aws sso login --profile personal
```

If SSO login requires browser or credential access outside the sandbox, request Codex escalation. Keep AWS credentials mounted read-only in Terraform containers.

## State Backend Bootstrap

State is stored in S3. Bootstrap only when the backend bucket/state infrastructure does not exist yet.

```bash
docker run --rm -v "$PWD/infra/aws/bootstrap:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 init
docker run --rm -v "$PWD/infra/aws/bootstrap:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 apply
docker run --rm -v "$PWD/infra/aws:/workspace" -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE=personal -w /workspace hashicorp/terraform:1.14 init
```

## Other Providers

The `infra/` directory is organized by provider. For a provider such as GCP, use the provider module path as the workspace mount and adjust credentials/environment variables:

```bash
docker run --rm -v "$PWD/infra/gcp:/workspace" -w /workspace hashicorp/terraform:1.14 <terraform-args>
```

Keep provider-specific credential handling inside the Docker command rather than assuming host Terraform state.
