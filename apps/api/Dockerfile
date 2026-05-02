# syntax=docker/dockerfile:1
FROM public.ecr.aws/docker/library/rust:1.95 AS base

FROM base AS dev
RUN <<EOT
cargo install cargo-watch
rustup component add clippy rustfmt
EOT
WORKDIR /apps/api

FROM base AS builder
WORKDIR /apps/api
COPY . .
RUN cargo build --release

# --- Runtime Stage ---
FROM public.ecr.aws/debian/debian:stable-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && update-ca-certificates
COPY --from=builder /apps/api/target/release/walking-dog-api .
EXPOSE 3000
CMD ["./walking-dog-api"]
