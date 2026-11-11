# syntax = docker/dockerfile:1

ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun"

WORKDIR /app

ENV NODE_ENV="production"
ENV PORT="8080"

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules (root workspace for shared deps)
COPY .npmrc bun.lock package-lock.json package.json ./
RUN bun install

# Copy application code
COPY . .

# Remove development dependencies for a lean runtime image
RUN rm -rf node_modules && \
    bun install --ci --production

# API server entry point: artifacts/api-server/src/index.ts
# It reads PORT, boots the outreach engine, crawler, vault, and workers.
EXPOSE 8080
CMD [ "bun", "x", "tsx", "artifacts/api-server/src/index.ts" ]
