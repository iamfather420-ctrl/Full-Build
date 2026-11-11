# SolveX Docker worker host

This service is the **host-side dispatcher**, not the execution image. It requires a Docker-capable host with a local Docker daemon and a preloaded digest-pinned SolveX sandbox image.

## Required runtime configuration

- `SOLVEX_WORKER_TOKEN`: high-entropy bearer token, stored only as a Railway service secret.
- `SOLVEX_SANDBOX_IMAGE`: immutable image reference ending in `@sha256:<64 lowercase hex chars>`.
- `PORT`: supplied by the host platform (default `8080`).
- `SOLVEX_WORKER_HOST`: bind address. Defaults to `127.0.0.1` for a host-local reverse proxy such as Caddy. Set to `0.0.0.0` only when a trusted platform ingress or host firewall provides the public TLS/authentication boundary.

Do not configure production database credentials, Neon owner credentials, oracle signing keys, or payment secrets on this worker.

## API

- `GET /health`: checks configuration and runs `docker info`; returns 503 if the Docker daemon is unavailable.
- `POST /v1/jobs`: authenticated raw JavaScript source body, max 100 KB. Runs one isolated container and returns a bounded receipt.

The dispatcher enforces no network, read-only root, non-root UID, dropped capabilities, no-new-privileges, memory/CPU/PID limits, a bounded tmpfs, a 15-second timeout, and at most two concurrent jobs. It passes only a minimal PATH and a bounded Node heap to the container. The worker itself must not be exposed publicly without TLS and a secret token.

## Important deployment constraint

An ordinary Railway service does not automatically receive a Docker daemon or Docker socket. Deploying this service on a host without Docker will correctly leave `/health` at 503 and reject job execution. Provision a Railway Sandbox/Docker-capable host, preload the exact sandbox image digest, and only then configure the two secrets above. Do not mount the production host's Docker socket or inject application/database credentials into jobs.
