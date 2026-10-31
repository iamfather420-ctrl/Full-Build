# Daisy local model registry and weights

Daisy's default local model is **Qwen3 1.7B Instruct in GGUF `Q4_K_M` format**, maintained as a separate static weight download rather than checked into the Git repository. The upstream Qwen model card identifies Qwen3-1.7B as a post-trained 1.7-billion-parameter model, lists a 32,768-token context, and declares Apache-2.0 licensing [1]. The Unsloth GGUF model card also declares Apache-2.0; its file listing contains `Qwen3-1.7B-Q4_K_M.gguf` at 1.11 GB [2].

The registry pins that artifact to source revision `bd59ef4c1c7af8b7ade0d473f3ab0d48b9f1d338`. Its exact size is **1,107,409,472 bytes** and its SHA-256 is **`b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897`**. These values were checked against the downloaded file; the SHA-256 also matches the Hugging Face linked-file metadata. The application keeps a copy of this identity and verifies both size and SHA-256 before declaring the registered weights valid.

Qwen's local-running guide documents Qwen3 support in llama.cpp from version `b5092` and shows the GGUF download-and-run workflow [3]. llama.cpp documents the `llama-cli` executable and local GGUF inference [4]. Daisy formats chat input as Qwen3 ChatML, invokes only an explicitly configured local executable, uses bounded generation, and passes the CLI's offline flag. It does not call a hosted model or an external inference endpoint. A static model-file download is the only remote step in obtaining weights.

The registry endpoint exposes model identity, license, source revision, expected file size/hash, file verification state and executable status. It deliberately does not disclose local paths. Chat stays blocked if the model file is missing, has the wrong size/hash, or the local executable is absent or non-executable. The official source archive is created from commit-tracked files by `npm run package:source` (or `node scripts/package_daisy_source.mjs`); it explicitly filters `.gguf` weights and partials, excludes private `.env` files, and preserves `.env.example` plus the registry. It writes a SHA-256 sidecar. The model file is distributed separately from that archive.

## Local setup

1. From the `daisy-ai-os` directory, run `npm run models:download` to stream the registered model file into `daisy-ai-os/models`; the installer checks exact size and SHA-256 before installing it. The downloader contacts only the pinned public static file URL in the registry.
2. Install or build llama.cpp for the target operating system and hardware. Use a version with Qwen3 support (`b5092` or newer), then set `DAISY_INFERENCE_ENGINE` in the local, uncommitted `.env` to the absolute path to `llama-cli`. The model path defaults to `daisy-ai-os/models/Qwen3-1.7B-Q4_K_M.gguf`; `DAISY_MODEL_PATH` can override it.
3. Run `npm start` from `daisy-ai-os`, then inspect `/api/models` on the loopback server. The registry will report READY only after the local model hash is verified and the configured executable is usable.

This model and quantization are compact relative to larger local models, but generation speed and available context depend on the device. A 32K model context is the model's advertised capability; Daisy currently asks llama.cpp for a smaller 4K working context to limit memory use. No local model can guarantee factual accuracy.

## Sources

[1]: https://huggingface.co/Qwen/Qwen3-1.7B "Qwen3 1.7B base model card"
[2]: https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/tree/bd59ef4c1c7af8b7ade0d473f3ab0d48b9f1d338 "Unsloth Qwen3 GGUF files at the pinned revision"
[3]: https://qwen.readthedocs.io/en/latest/run_locally/llama.cpp.html "Qwen local llama.cpp guide"
[4]: https://github.com/ggml-org/llama.cpp/blob/master/tools/cli/README.md "llama.cpp CLI documentation"
