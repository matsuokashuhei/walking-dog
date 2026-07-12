# syntax=docker/dockerfile:1
FROM public.ecr.aws/docker/library/rust:1.96 AS base

FROM base AS dev
RUN <<EOT
apt-get update
apt-get install -y curl pkg-config libssl-dev
cargo install cargo-watch sea-orm-cli@^2.0.0-rc evcxr_repl
rustup component add clippy rustfmt
EOT

FROM dev AS sonar
RUN <<EOT
cargo install cargo-llvm-cov
rustup component add llvm-tools-preview
EOT

FROM base AS builder
WORKDIR /apps/api
COPY . .
RUN cargo build --release --locked -p api-bootstrap \
    --bin api --bin track-point-worker --bin schema --bin migrate

# --- Runtime Stage ---
FROM public.ecr.aws/debian/debian:stable-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /apps/api/target/release/api /usr/local/bin/api
COPY --from=builder /apps/api/target/release/track-point-worker /usr/local/bin/track-point-worker
COPY --from=builder /apps/api/target/release/schema /usr/local/bin/schema
COPY --from=builder /apps/api/target/release/migrate /usr/local/bin/migrate
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD ["curl", "--fail", "--silent", "http://127.0.0.1:3000/health"]
CMD ["api"]
