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
RUN cargo build --release

# --- Runtime Stage ---
FROM public.ecr.aws/debian/debian:stable-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && update-ca-certificates
COPY --from=builder /apps/api/target/release/walking-dog .
COPY --from=builder /apps/api/target/release/track_point_worker .
EXPOSE 3000
CMD ["./walking-dog"]
