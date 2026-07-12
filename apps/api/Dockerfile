# syntax=docker/dockerfile:1
FROM public.ecr.aws/docker/library/rust:1.96@sha256:1f0dbad1df66647807e6952d1db85d0b2bda7606cb2139d82517e4f009967376 AS base

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
FROM public.ecr.aws/debian/debian:stable-slim@sha256:f6beb142597164872b0182176972052ade2466c516a922cc9a9388f0e2eb615e AS runtime
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
