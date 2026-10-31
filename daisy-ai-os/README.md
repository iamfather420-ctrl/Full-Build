# Daisy Haminja Local OS

Daisy's native Node runtime serves a local status and chat interface and binds only to `127.0.0.1`. It uses the pinned Qwen3 1.7B Q4_K_M GGUF file through a local `llama.cpp` `llama-cli` executable. There is no remote AI API, provider key, cloud-model fallback, or synthetic chat response. Model readiness is fail-closed: Daisy checks the registered file's exact byte size and SHA-256 and requires an executable named `llama-cli` before enabling chat.

## Requirements and setup

Use Node.js 22.13 or newer and CMake plus a C++ compiler. From this directory:

```sh
npm run models:download
cp .env.example .env
```

The installer streams the pinned 1.1 GB GGUF artifact to `models/Qwen3-1.7B-Q4_K_M.gguf`. It verifies the downloaded byte count and SHA-256 against `models/registry.json` before atomically moving it into place. Weights and partial downloads are ignored by Git and excluded from the official source archive. The installer never downloads or executes an inference engine.

From the repository root, run `npm run package:source` to create `dist/Full-Build-source-<commit>.zip` and its `.sha256` sidecar. The packager refuses an uncommitted worktree, archives the selected commit's tracked files only, filters all `.gguf` weights and partials plus private `.env` files, and preserves `.env.example` and the model registry.

Build `llama.cpp` locally using its upstream CMake project:

```sh
git clone https://github.com/ggml-org/llama.cpp.git
cmake -S llama.cpp -B llama.cpp/build -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=OFF
cmake --build llama.cpp/build --config Release --target llama-cli -j
```

Set `DAISY_INFERENCE_ENGINE` in `.env` to the absolute path of the resulting `llama.cpp/build/bin/llama-cli` executable (Windows: the corresponding `llama-cli.exe`). The default model identity and file path are already registered. If you want to store the weights elsewhere, set `DAISY_MODEL_PATH` to the absolute local GGUF path. Do not select a different model file without updating its reviewed registry entry and checksums.

Start Daisy from this directory:

```sh
npm start
```

It listens on `http://127.0.0.1:3090` by default. `PORT` can select a different valid port from 1024 through 65535; the bind address remains loopback-only. Open that URL on the same device. The status page displays model provenance, license, file size, expected SHA-256, verified weight state and engine state. `GET /api/health` and `GET /api/models` provide the local runtime and model-registry status. Chat history stays in the current browser tab and is not saved to a conversation database.

## Model and inference details

The immutable registry pins `Qwen3-1.7B-Q4_K_M.gguf` from the `unsloth/Qwen3-1.7B-GGUF` repository at revision `bd59ef4c1c7af8b7ade0d473f3ab0d48b9f1d338`. It records the model card, Apache-2.0 license, 1,107,409,472-byte expected size, and SHA-256 `b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897`. The hash and exact size are checked on first inspection and whenever the file's recorded size or modification time changes.

For Qwen3, Daisy serializes system/user/assistant turns as ChatML and invokes the registered local CLI with single-turn and offline options plus bounded context and output settings. Sampling is not deterministic. Provider credentials are not forwarded into the child process. `--offline` is an engine option, not an OS-level network sandbox: the Daisy application does not make external AI calls, but operators who require a system-wide offline guarantee should enforce network restrictions at the operating-system level. Do not configure a remote wrapper as the inference executable.

If the model file is absent, its integrity differs, or `llama-cli` is missing or not executable, chat remains blocked and the UI shows the reason. The runtime does not generate a substitute answer. The separately verified activation/proof gate remains blocked unless its source-bound evidence requirements are met; a running server or available local model does not imply that the operating system's formal activation gate passed.

## Native tools and authorization

`POST /api/tools/invoke` is loopback-only and requires an HMAC-SHA-256 authorization signed by a human-rooted operator using `DAISY_OS_PERMISSION_SECRET` (at least 32 characters). Authorizations are bound to actor, subject, resource, action and expiry. Consumed IDs are single-use in the current process, but replay IDs are not durable across restarts. No endpoint issues authorization tokens. `mem_summary` and `proc_status` return process-scoped telemetry. Filesystem listing, audit-tail and node-ping remain explicitly `NOT_IMPLEMENTED`; Daisy does not invent their results.

## Checks

Run the regression suite with Node 22.13 or newer:

```sh
npm test
```

It checks permission authorization and replay handling, unsupported-tool behavior, loopback/CSP/API behavior, absence of provider credentials in local inference, Qwen3 ChatML/offline CLI arguments, and registry size/SHA-256/engine fail-closed behavior. Tests use local fixtures and loopback only; they do not call an external AI service or require the full GGUF weights to be installed.
