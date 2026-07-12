# Local Harness Runbook

The API kernel uses Testcontainers as the only development and test service
topology. Production Compose under `infra/sakura/compose.yml` is deployment-only
and must not be used as a local test harness. Required tests never call live AWS.

Run the architecture compiler from the API workspace:

```bash
cd apps/api
cargo xtask architecture check
```

Run API tests with the pinned Rust toolchain. Adapter integration tests start
only their required containers and own their lifecycle, ports, and cleanup:

```bash
cd apps/api
cargo test --workspace --all-targets --all-features --locked
```

When the host does not provide Rust, use the repository API image and isolated
Caches from the repository root:

```bash
docker run --rm \
  -v "$PWD":/walking-dog \
  -v apps_cargo_cache:/usr/local/cargo \
  -v apps_api_target_harness:/tmp/walking-dog-target \
  -w /walking-dog/apps/api \
  apps-api cargo test --target-dir /tmp/walking-dog-target -j 1 \
    --workspace --all-targets --all-features --locked
```

The PR 1 kernel exposes no product GraphQL or queue operation. Its executable
evidence is architecture validation, bootstrap tests, image startup, truthful
`/health`, and graceful shutdown. Therefore this change has **no affected
journey** for Maestro.

Repository-wide validation remains:

```bash
scripts/harness/validate-all.sh
```
