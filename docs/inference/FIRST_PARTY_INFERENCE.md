# First-party inference runtime

**Status:** Interface and fail-closed integration landed. **No verified model weights or inference engine are present in the repository.**

## Finding

Repository and release-archive inspection has not found verified GGUF / ONNX / SafeTensors weights, tokenizer assets, or a bundled local inference engine. The chat endpoint previously depended on optional Gemini (`ALLOW_EXTERNAL_MODEL_PROVIDER`).

Model assets may exist only inside the multi-part Daisy ISO / Smash archives, but that possibility is not proof that a usable model is present. Until model weights and an engine are recovered and verified, generative first-party inference remains **BLOCKED**.

## What was implemented

| Module | Role |
| --- | --- |
| `src/inference/InferenceRuntime.ts` | Inference contracts, limits, and explicit statuses |
| `src/inference/LocalInferenceRuntime.ts` | Local engine adapter, asset checks, request validation, timeout/cancel handling |
| `src/inference/InferenceRouter.ts` | Prefers first-party local inference; never invents replies |
| Native `/api/chat` | Tries first-party inference before an explicitly opted-in external provider |
| `/api/inference/status` | Reports local runtime readiness and external-provider opt-in without exposing secrets |

The runtime reports `offlineCapable: false` because setting an environment variable is not OS-level network isolation. This runtime does not itself enforce network isolation.

## Configuration contract (only after assets are verified)

```bash
export DAISY_MODEL_PATH=/secure/models/daisy.gguf
export DAISY_INFERENCE_ENGINE=/usr/local/bin/daisy-infer
export DAISY_MODEL_ID=daisy-local
export DAISY_MODEL_VERSION=1.0.0
```

The configured engine must implement the documented CLI contract:

```text
$DAISY_INFERENCE_ENGINE --model $DAISY_MODEL_PATH --prompt "..."
# prints completion text to stdout and exits 0 on success
```

A readable file path is not proof that an engine can load the model. Before production use, run a controlled integration test against an actual model and engine, with network access disabled by an external sandbox/container policy, and verify real output plus failure behavior.

## Explicit non-goals

- Do not commit multi-gigabyte model weights into git.
- Do not silently fall back to Gemini.
- Do not return simulated AI text when the model is missing or an engine fails.
- Formal Z3 verification is not generative inference.
- Do not treat a local verification pass as proof of production identity, tenant isolation, provider integration, or deployment readiness.

## Completion criteria

First-party inference is not complete until all of the following are evidenced:

1. Verified model weights and an executable engine are available and successfully load together.
2. A real inference succeeds in a network-isolated test environment.
3. Missing assets, malformed and oversized requests, engine errors, timeout, cancellation, empty output, and output limits fail safely.
4. Successful results record runtime, model ID, model version, and reproducible test evidence.
5. The actual production execution environment enforces the intended network restrictions independently of this runtime.

Until then, the endpoint must report `BLOCKED` / `FIRST_PARTY_MODEL_UNAVAILABLE` when local inference is unavailable. An external provider is used only when explicitly opted in with `ALLOW_EXTERNAL_MODEL_PROVIDER=true` and correctly configured.

## Evidence integration checkpoint — 2026-10-27 (latest checked PR revision)

The latest checked PR head is `f4074ad42f8c887eb62a4fda348619f7f4eb41b2`. All four required pull-request workflows passed for that head:

- Build and Enterprise CI — run `40572686563`
- Native UI Build — run `40572686628`
- Formal Evidence Hash Stability — run `40572686435`
- Authoritative 120-Case Verification — run `40572686417`

The authoritative-verification artifact was generated from synthetic PR merge revision `4e5aa3cdb66bca3e088c3ecba83f264faca47635`, not the PR branch-head SHA. That distinction is intentional for CI: it validates the merge result tested by the workflow. It must not be misrepresented as evidence already bound to a later production runtime commit. Artifact `authoritative-verification-4e5aa3cdb66bca3e088c3ecba83f264faca47635` was available from run `40572686417`.

Verified results from that CI run:

- Formal corpus: 120/120 Z3 executions, 120/120 expected-result matches, and 120/120 deterministic replay matches; 118 UNSAT, 2 SAT, zero unknown, zero errors.
- Formal combined root: `cec93775b41d5132a1ea0e0865d62916b873913a461b748f0595dfb5579a7b04`.
- Authoritative 15-gate pipeline: 12/15 passed; Gate-11 requires external providers; Gate-12 lifecycle is blocked because trusted identity and signed tenant claims are unavailable; Gate-14 remains blocked.
- Production verdict: `BLOCKED_MISSING_EXTERNAL_CREDENTIALS`.
- The first-party inference tests passed for missing assets, malformed roles, oversized messages, and directories incorrectly presented as model/engine assets. They do not prove successful real inference or OS-level network isolation.

These results are **CI-green, not production-ready**. The 120-case formal corpus validates its formal cases; it does not prove that the full operating system, all 54 nodes, provider integrations, authentication, persistence, and recovery work end to end.

## Remaining blockers

1. **First-party inference:** obtain and verify real model weights and a compatible engine; complete an actual network-isolated success/failure test.
2. **Identity and authorization:** establish a reviewed authentication/authorization path and trusted signed tenant claims; do not mint local sessions or bypass gates.
3. **External providers:** configure and independently verify required Neon and payment-provider integrations in a safe non-production environment first. Payments remain disabled.
4. **Evidence freshness:** regenerate evidence for the exact revision intended for runtime and validate artifact schema, source commit, timestamps, roots, and cross-file consistency.
5. **Lifecycle and recovery:** prove the real authorized lifecycle, persistence, tenant isolation, backup/restore, and failure recovery with integration tests before any production decision.

This checkpoint is evidence reconciliation only. It does not configure providers, execute lifecycle transitions, activate Daisy, enable authentication or payments, merge the PR, or authorize deployment.
