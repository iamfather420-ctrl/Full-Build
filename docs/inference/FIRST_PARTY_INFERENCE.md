# First-party inference runtime

**Status:** Interface and fail-closed integration landed. **No model weights are present in this repository.**

## Finding

Searches of `Full-Build` history and related public `iamfather420-ctrl` repositories found:

- No GGUF / ONNX / SafeTensors weights
- No tokenizer dumps
- No bundled llama.cpp / onnxruntime binaries
- Chat previously depended on optional Gemini (`ALLOW_EXTERNAL_MODEL_PROVIDER`)

Model assets may exist only inside the multi-part Daisy ISO / Smash archives. Until those are recovered and verified, generative first-party inference remains **BLOCKED**.

## What was implemented

| Module | Role |
| --- | --- |
| `src/inference/InferenceRuntime.ts` | Contracts, limits, status codes |
| `src/inference/LocalInferenceRuntime.ts` | Local engine + model path probe; spawn-based CLI runner |
| `src/inference/InferenceRouter.ts` | Prefer first-party; never invent replies |
| Native `/api/chat` (updated) | Tries first-party before optional Gemini |

## Configuration (when assets exist)

```bash
export DAISY_MODEL_PATH=/secure/models/daisy.gguf
export DAISY_INFERENCE_ENGINE=/usr/local/bin/daisy-infer   # or llama-cli wrapper
export DAISY_MODEL_ID=daisy-local
export DAISY_MODEL_VERSION=1.0.0
```

Engine CLI contract:

```text
$DAISY_INFERENCE_ENGINE --model $DAISY_MODEL_PATH --prompt "..."
# prints completion text on stdout, exit 0 on success
```

## Explicit non-goals

- Do not ship multi-GB weights in git
- Do not silently fall back to Gemini
- Do not return simulated “AI” text when the model is missing
- Formal Z3 verification is **not** generative inference

## Completion criteria (from remaining-work checklist)

Daisy produces real responses through its own verified runtime **only when**:

1. Model weights and engine are present and probed `ready: true`
2. Offline test succeeds with network disabled
3. Malformed prompts, timeout, cancel, and missing-model paths return explicit non-success statuses
4. Evidence records `runtimeId`, `modelId`, and `modelVersion`

Until then, `/api/chat` must continue returning `BLOCKED` / `FIRST_PARTY_MODEL_UNAVAILABLE` (or opt-in external provider if the creator sets the flag).

## Evidence integration checkpoint — 2026-10-27 (refreshed)

The latest completed CI set for PR #54 ran against branch head `17c49501d6169c49d8faaf4bb2961f33b4d602a8`. All four required workflows passed: Build and Enterprise CI (run `40561707659`), Native UI Build (`40561707741`), Formal Evidence Hash Stability (`40561707592`), and Authoritative 120-Case Verification (`40561707619`).

The authoritative verification artifact was downloaded and inspected. Its four relevant evidence records agree on source commit `20fb0597d4ae2dc1a96e294664ce46b1f457c781`; the formal summary's combined root and run receipt match the activation record.

The evidence is internally consistent but does **not** authorize activation:

- 120/120 formal cases and 120/120 clean-room replays matched; 118 UNSAT, 2 SAT, zero unknowns, and zero errors.
- 42/46 system gates passed; three are blocked and one requires an external provider.
- The activation record and overall 46-gate verdict are both `BLOCKED`.
- The 15-gate pipeline reports 12 passed and `BLOCKED_MISSING_EXTERNAL_CREDENTIALS`; trusted identity and signed tenant claims remain unavailable.
- Artifact source SHA `20fb0597...` is the CI-generated pull-request merge revision, not the branch head SHA `17c49501...`. Do not treat the artifacts as evidence for a different runtime revision. Regenerate evidence for the exact revision intended for runtime before any activation decision.

The local-inference fail-closed test now correctly expects `offlineCapable: false`, because the runtime sets an environment hint but does not enforce OS-level network isolation. A real offline execution test and verified local model/engine are still outstanding.

This checkpoint is evidence reconciliation only. It does not configure providers, execute lifecycle transitions, activate Daisy, enable payments, or authorize deployment.
