# API kernel

This workspace contains the replacement API architecture and bootstrap kernel.
It intentionally exposes no product GraphQL or queue behavior.

```bash
cargo xtask image-catalog generate
cargo xtask image-catalog verify
cargo xtask architecture check
cargo test --workspace --all-targets --all-features --locked
cargo run -p api-bootstrap --bin api
cargo run -p api-bootstrap --bin track-point-worker
cargo run -p api-bootstrap --bin schema
cargo run -p api-bootstrap --bin migrate
```

`GET /health` reports bootstrap readiness. Integration tests own their isolated
services through Testcontainers; required development and CI workflows do not
use production Compose or live AWS.
