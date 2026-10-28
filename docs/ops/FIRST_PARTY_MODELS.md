# First-party models (no third-party SaaS)

## Status

- **Registry:** `models/registry.json`
- **Code:** `src/brain/FirstPartyModelRegistry.ts`, `src/brain/FirstPartyInferenceRuntime.ts`
- **Weights on git:** **none** (by design)
- **Third-party cloud chat:** **prohibited** on this path

## What you must supply

1. A licensed **GGUF** (or ONNX) file under `models/gguf/` (see registry `relative_path`).
2. Optional SHA-256 in `registry.json` → `expected_sha256`.
3. A **local** runner binary (`llama-cli`, `llama-server`, etc.) via `FIRST_PARTY_INFERENCE_RUNTIME`.
4. `FIRST_PARTY_INFERENCE_ENABLED=true` only after (1)–(3).

## What will not be added here

- Gemini / Google GenAI as the default brain
- OpenAI / Anthropic / xAI HTTP chat completions
- Fake “weights present” without files on disk

## Verify

```bash
node scripts/verify_first_party_models.mjs
```

## Chat path

Wire server chat to `FirstPartyInferenceRuntime.generateResponse` first. Keep any external provider behind a separate, explicit opt-in that is **off** by default — never as a silent fallback when local weights are missing.
