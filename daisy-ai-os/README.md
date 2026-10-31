# Daisy Haminja Local OS

This native Node runtime binds only to `127.0.0.1` and serves a self-contained status/chat page at `/`. Chat calls only the configured local inference executable through the first-party runtime in `../src/inference/LocalInferenceRuntime.ts`; this application does not call a remote AI API and has no cloud-model fallback. If the local model or executable is missing or fails, the chat endpoint returns a blocked/error status and no substitute answer.

## Run

Use Node.js 22.13 or newer, from this directory:

```sh
npm start
```

The service listens on port 3090 by default. `PORT` can select a different valid port (1024–65535); the bind address remains loopback-only. Visit `http://127.0.0.1:3090/` from the same device. The local UI keeps conversation history in the current browser tab only. The service has no conversation database.

## Local inference

Set `DAISY_MODEL_PATH` to a local model file and `DAISY_INFERENCE_ENGINE` to a local executable implementing the CLI contract `ENGINE --model MODEL_PATH --prompt PROMPT`. Optional labels are `DAISY_MODEL_ID` and `DAISY_MODEL_VERSION`. `DAISY_SYSTEM_PROMPT` may provide a local system instruction. No model weights are included in this repository or the uploaded archive; without both a readable model file and executable engine, inference remains `MODEL_UNAVAILABLE`.

The runtime passes `DAISY_INFERENCE_OFFLINE=1` to the child process as a hint, not as an OS-level network sandbox. The runtime reports `offlineCapable: false`; configure a genuinely local executable and apply OS network restrictions if strict offline execution is required. Do not point the engine path at a network client or remote proxy.

## Native tools and authorization

`POST /api/tools/invoke` is bound to loopback and requires an HMAC-SHA-256 authorization signed by a human-rooted operator with `DAISY_OS_PERMISSION_SECRET` (at least 32 characters). Authorizations are bound to actor, subject, resource, action, and expiry; consumed IDs are single-use within the current process. No endpoint issues authorization tokens. In this process-only implementation, replay IDs are in memory and are not durable across restart. `mem_summary` and `proc_status` return process-scoped telemetry; filesystem listing, audit-tail, and node-ping are explicitly `NOT_IMPLEMENTED` rather than returning invented data.

The OS activation gate remains blocked unless the root gate accepts a fresh, commit-bound activation record with the required 120-case, adversarial, 46-gate, and hash-shape fields. That gate checks record metadata; it does not independently rerun the Z3 proofs or recompute evidence contents/hashes, so an accepted `ACTIVE` record is not by itself independent verification of those artifacts. A responsive HTTP server does not imply that the AI OS or model is active.

## Checks

```sh
npm test
```

The test suite uses only Node's local loopback interface and verifies authorization, unsupported-tool behavior, status serving, and fail-closed local inference. It does not contact an external AI service.
