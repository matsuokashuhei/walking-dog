# --- Build Stage ---
FROM rust:1-slim-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY migration/Cargo.toml ./migration/
COPY src ./src
COPY migration/src ./migration/src
RUN cargo build --release

# --- Runtime Stage ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/walking-dog-api .
EXPOSE 3000
CMD ["./walking-dog-api"]
