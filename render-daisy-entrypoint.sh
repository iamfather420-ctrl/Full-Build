#!/usr/bin/env bash
set -euo pipefail

export DAISY_MODEL_PATH="${DAISY_MODEL_PATH:-/opt/daisy/model.gguf}"
export DAISY_INFERENCE_ENGINE="${DAISY_INFERENCE_ENGINE:-/app/scripts/daisy-infer.sh}"
export DAISY_MODEL_ID="${DAISY_MODEL_ID:-HuggingFaceTB/SmolLM2-135M-Instruct}"
export DAISY_MODEL_VERSION="${DAISY_MODEL_VERSION:-d158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd}"

chmod +x /app/scripts/daisy-infer.sh
python3 /app/scripts/fetch_daisy_model_release.py
test -s "$DAISY_MODEL_PATH"
test -x "$DAISY_INFERENCE_ENGINE"
test -x "${DAISY_LLAMA_CLI:-/usr/local/bin/llama-cli}"

# Normalize supported Neon connection-string names without printing credentials.
source /app/register_database_url.sh

# Start the Full-Build Express server. This mounts /api/daisy/chat through
# src/server/apiRouter.ts; fly-start.sh is intentionally not used because it
# starts the separate outreach service.
exec bun /app/server.ts
