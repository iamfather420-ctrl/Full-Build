# syntax = docker/dockerfile:1

ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun"

WORKDIR /app

ENV NODE_ENV="production"
ENV PORT="8080"

# Install packages needed to build native Node/Bun modules.
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install dependencies from the repository lockfile.
COPY .npmrc bun.lock package-lock.json package.json ./
RUN bun install

# Copy application code.
COPY . .

# Keep tsx available: the API entry point is TypeScript and tsx is currently
# declared in devDependencies. Removing devDependencies here makes the
# container's startup command unable to resolve tsx.
EXPOSE 8080
CMD [ "bun", "x", "tsx", "artifacts/api-server/src/index.ts" ]
