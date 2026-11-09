# SolveX isolated execution sandbox

This image executes submitted JavaScript only inside the Docker isolation boundary configured by `IsolatedExecutionSandbox`.

## Build

Use a Node image reference pinned to an immutable digest; do not use a floating tag:

```sh
docker build --build-arg NODE_BASE_IMAGE='node:<approved-version>@sha256:<verified-digest>' -f sandbox/Dockerfile -t solvex-sandbox:local sandbox
docker image inspect solvex-sandbox:local --format '{{index .RepoDigests 0}}'
```

Set `SOLVEX_SANDBOX_IMAGE` to the resulting registry image digest. The runtime refuses tag-only references.

## Runtime boundary

The host runner starts containers with no network, read-only root filesystem, a bounded tmpfs, non-root UID, all Linux capabilities dropped, no-new-privileges, memory and swap caps, CPU quota, PID limit, bounded output, and a hard timeout. Docker daemon access is required on the host. The image does not contain application credentials.

The entrypoint reads at most 100 KB from stdin and runs it as a child Node process with a 15-second timeout and bounded output. This is a constrained code-execution harness, not a proof that arbitrary programs are correct. Review the host kernel, Docker daemon, image provenance, and runtime policy before treating it as a production security boundary.
