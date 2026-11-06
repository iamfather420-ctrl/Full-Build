# Daisy Consensus Runtime Security Boundary

This module adds the runtime enforcement path around the 3-of-3 verifier. It is deliberately fail-closed and does not enable production actions by default.

## Five required controls

1. **Evaluator isolation** — `DockerIsolatedEvaluatorRunner` launches one fresh container per evaluator, sequentially, with no network, read-only root filesystem, dropped Linux capabilities, no-new-privileges, bounded CPU/memory/PIDs, non-root UID, and only that evaluator's private signing key mounted read-only. The exact same canonical input is sent on stdin. No peer output is sent to another evaluator. Docker daemon / host integrity remains part of the trusted computing base.
2. **Protected policy and roster** — `loadTrustedRuntimeConfig` verifies an Ed25519 signature over the canonical policy + evaluator roster using `DAISY_POLICY_ROOT_PUBLIC_KEY`. The runtime constructor independently verifies the signature again. There is no default key, roster, or policy. The signing root must be held outside the application and evaluator containers.
3. **Durable replay protection** — `SqliteDaisyNonceStore` uses a disk-backed SQLite database, a unique nonce primary key, `BEGIN IMMEDIATE`, and a committed insert. It refuses the existing in-memory SQLite fallback. The nonce is consumed before execution; failures after consumption require a new proposal and vote round.
4. **Executor-side revalidation** — `DaisyBoundedExecutor` recomputes proposal and policy digests, verifies all three signatures again at dispatch time, checks the allowlisted action and target, and dispatches only an explicitly injected trusted handler. It exposes no shell or model-controlled command execution.
5. **End-to-end tests** — runtime tests cover identical sealed inputs, sequential evaluator calls without peer-result sharing, unanimous execution, replay rejection, evidence mutation, and missing trusted action handlers. The existing verifier tests cover denial, missing/duplicate votes, invalid signatures, and policy scope.

## Required deployment configuration

The signed JSON in `DAISY_RUNTIME_CONFIG_JSON` must contain exactly:
- `policy`: a current `ConsensusPolicy` with three distinct `evaluator_ids`, narrow `allowed_actions` and `allowed_targets`, bounded vote/proposal ages, and rollback requirements.
- `evaluators`: exactly three entries, each containing `evaluator_id`, `public_key_pem`, `image`, and `signing_key_file`.

Set `DAISY_RUNTIME_CONFIG_SIGNATURE` to the base64 Ed25519 signature over canonical JSON of the object containing only `policy` and `evaluators`. Set `DAISY_POLICY_ROOT_PUBLIC_KEY` to the trusted root public key PEM. Each image must be pinned by immutable SHA-256 digest and must contain the audited evaluator program at `/app/evaluate.js`, Node at `node`, and emit exactly one signed vote JSON object on stdout. The private key file must be a regular file, owned by a non-root host UID, and have no group/other permissions. The host must have a trusted Docker daemon.

Construct `SqliteDaisyNonceStore` only after the application's disk-backed SQLite store is initialized. If it falls back to memory, construction fails. Inject a `DaisyBoundedExecutor` with only the concrete, reviewed action handlers that are pre-authorized by the signed policy. Do not register production deployment, payments, irreversible operations, or broad shell handlers until separate production gates authorize them.

## What CI proves — and does not prove

CI exercises the verifier and orchestration contracts using test doubles. It does not prove that the deployment host has Docker isolation correctly configured, that production signing keys are protected, that the production database is durable, or that a real evaluator image has been independently audited. Those must be verified in the target environment before enabling the runtime. No production execution is enabled by this PR.
