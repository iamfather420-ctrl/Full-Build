# ==============================================================================
# dAIsy HaMINJA Paradox Operator Resolver Dockerfile (Rust-based WASM/Arithmetic Engine)
# ==============================================================================
FROM rust:1.75-slim-bookworm AS builder

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies
RUN cargo new --bin paradox-solver
WORKDIR /usr/src/app/paradox-solver
COPY Cargo.toml Cargo.lock ./
RUN cargo build --release && rm src/*.rs

# Copy real source code and build production binary
COPY src ./src
RUN touch src/main.rs && cargo build --release

# Production Runner
FROM debian:bookworm-slim AS runner

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/paradox-solver/target/release/paradox-solver /usr/local/bin/paradox-solver

EXPOSE 50051

# Hardened security: Run as non-privileged system user
RUN groupadd -g 10001 daisy && useradd -u 10001 -g daisy daisy-paradox
USER daisy-paradox

CMD ["paradox-solver"]
