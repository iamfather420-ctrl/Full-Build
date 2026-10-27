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

## Evidence integration checkpoint — 2026-10-27

The latest PR validation bundle was downloaded and inspected. All four required workflows passed on code-bearing PR head `fdf9b3d5edd354b433c97674f057dbeaeca9c523`. The subsequent PR commit updates this checkpoint documentation only. The generated evidence bundle is bound to the tested PR merge revision `481e3046c7703ca2556fff9f3541246a8e80f74d`; the four Paradox Ledger evidence files agree on that merge revision, and the formal summary's combined root and run receipt match the activation record.

The evidence is internally consistent but does **not** authorize activation:

- 120/120 formal cases and replays matched; 118 UNSAT, 2 SAT, zero unknown, and zero errors.
- 42/46 system gates passed; three are blocked and one requires external providers.
- The activation record and overall 46-gate verdict are both `BLOCKED`.
- The 15-gate pipeline reports `BLOCKED_MISSING_EXTERNAL_CREDENTIALS`; trusted identity and signed tenant claims are unavailable.
- The artifact SHA is the CI-tested PR merge revision, not the branch head SHA. Do not treat it as current for a different runtime revision. Regenerate evidence for the exact revision intended for runtime before any activation decision.

This checkpoint is evidence reconciliation only. It does not configure providers, execute lifecycle transitions, activate Daisy, enable payments, merge the PR, or authorize deployment.
