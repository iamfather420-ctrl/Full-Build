# syntax = docker/dockerfile:1

ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun"

WORKDIR /app

ENV NODE_ENV="production"
ENV PORT="8080"

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Copy the full source tree before installing so Bun can discover local workspaces.
# The repository bun.lock is npm-format/unsupported by this Bun version; resolve from package.json.
COPY . .
RUN rm -f bun.lock && bun install

EXPOSE 8080
CMD [ "bash", "./fly-start.sh" ]
