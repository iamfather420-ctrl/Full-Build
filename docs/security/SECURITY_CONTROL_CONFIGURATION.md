# FULL-BUILD security-control configuration

The controls below are fail-closed. Missing configuration is not a pass and does not enable production activation.

## Isolated execution sandbox

1. Build `sandbox/Dockerfile` using an approved Node base image pinned by immutable digest.
2. Push the resulting image to an approved registry and record its immutable image digest.
3. Set `SOLVEX_SANDBOX_IMAGE` to that digest-qualified image reference.
4. Ensure the host runtime has access to a Docker daemon. The runner applies `--network=none`, read-only root filesystem, non-root UID, dropped capabilities, no-new-privileges, tmpfs-only scratch space, CPU/memory/PID limits, and a hard timeout.

The sandbox image and Docker daemon are not provisioned by this repository commit. Until the image is built, scanned, published, and configured, pipeline stage 6 remains BLOCKED.

## Memory telemetry

Set `SOLVEX_MEMORY_LIMIT_BYTES` to the same or lower value than the sandbox memory cap. Stage 8 requires sandbox cgroup current/peak/limit/OOM telemetry plus orchestrator cgroup telemetry. Missing cgroup metrics or any OOM event blocks the stage.

## Single-model OpenAI Stage 14 evaluator

Stage 14 uses exactly one OpenAI model through the Responses API. The model evaluates the submitted evidence and returns a strict JSON `ACCEPT` or `REJECT` verdict with a rationale. Deterministic application checks bind the request hash, configured model identifier, verdict, and rationale hash. No Claude/Gemini consensus or second model is used.

Configure these runtime values in the deployment secret manager (never commit secret values):

- `OPENAI_API_KEY`: OpenAI API key with available API credits and access to the selected model
- `SOLVEX_OPENAI_MODEL`: optional model identifier; defaults to `gpt-4o-mini`

The model evaluator is not itself a cryptographic signer. After the model returns its verdict, Stage 14 sends a compact attestation payload to a separately operated, digest-pinned signer image implementing `/opt/solvex-oracle/attest`. That service must hold its Ed25519 private signing key outside the SolveX application runtime and return one JSON `OracleAttestation`. Configure:

- `SOLVEX_ORACLE_IMAGE`: immutable digest-qualified signer image reference
- `SOLVEX_ORACLE_ID`: stable signer identity
- `SOLVEX_ORACLE_ED25519_PUBLIC_KEY`: PEM public key used by SolveX to verify Ed25519 attestations

The signer image/operator and its public-key configuration are not provisioned by this repository. Stage 14 remains BLOCKED until the OpenAI evaluation succeeds and a matching Ed25519 attestation is received and verified. A model verdict alone is not a Stage 14 PASS.

## Persistent proof evidence

Configure:

- `SOLVEX_PROOF_DIR`: durable, private filesystem path with backups and retention controls
- `SOLVEX_PROOF_HMAC_KEY`: at least 32 bytes of high-entropy secret material stored in the deployment secret manager

The proof store writes atomically, fsyncs the file and directory, and validates payload SHA-256 plus HMAC on readback. This local envelope is integrity protection, not a substitute for immutable/WORM retention, key rotation, or external audit custody. Stage 17 remains BLOCKED until a real proof bundle is present and persisted/read back.

## Tenant encryption

Configure `SOLVEX_TENANT_ROOT_KEY` with at least 32 bytes of high-entropy secret material in the secret manager. TenantCrypto derives tenant-specific AES-256-GCM keys with HKDF-SHA256 and binds tenant ID as authenticated associated data.

This component-level crypto self-test does not prove database RLS, query scoping, or cross-tenant read/write isolation. Stage 19 intentionally remains BLOCKED until those database controls are independently tested against the actual persistence adapter and disposable database.

## Release boundary

Do not enable authentication, payments, production writes, or production deployment based on these local controls alone. Require exact-commit CI, independent security review, disposable-environment integration evidence, and an explicit production release approval.
