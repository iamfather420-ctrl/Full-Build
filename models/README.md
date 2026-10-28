# First-party model weights (Daisy / SOLVEX)

This directory holds **local, offline** model assets only.

## Rules

1. **No third-party cloud inference** in this path (no Gemini, OpenAI, Anthropic, Grok API, etc.).
2. Weights are **not** committed to git (too large). Place files here or under `DAISY_MODEL_ROOT`.
3. Registry is `models/registry.json` + `src/brain/FirstPartyModelRegistry.ts`.
4. Runtime stays **BLOCKED** until a registered file exists, passes size/hash checks, and `FIRST_PARTY_INFERENCE_ENABLED=true`.

## Layout

```
models/
  README.md                 (this file)
  registry.json             (canonical inventory)
  manifests/.gitkeep
  gguf/.gitkeep             (place *.gguf here)
  onnx/.gitkeep             (place *.onnx here)
  checksums/.gitkeep        (optional per-file .sha256)
```

## Install a weight (operator)

```bash
# Example: local GGUF
mkdir -p models/gguf models/checksums
cp /path/to/your-model.Q4_K_M.gguf models/gguf/daisy-primary.Q4_K_M.gguf
sha256sum models/gguf/daisy-primary.Q4_K_M.gguf | tee models/checksums/daisy-primary.Q4_K_M.gguf.sha256

# Point registry entry file_name / expected_sha256 at that file, then:
export FIRST_PARTY_INFERENCE_ENABLED=true
export DAISY_MODEL_ROOT="$(pwd)/models"
# Optional native runner (llama.cpp server, etc.):
export FIRST_PARTY_INFERENCE_RUNTIME="llama-cli"
export FIRST_PARTY_INFERENCE_RUNTIME_ARGS="-m models/gguf/daisy-primary.Q4_K_M.gguf -p"
```

Until those files exist, chat correctly returns **BLOCKED**.

## License

Only place weights you are licensed to run offline. Do not pull proprietary cloud APIs into this path.
