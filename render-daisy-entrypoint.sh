#!/usr/bin/env bash
set -euo pipefail

export DAISY_MODEL_PATH="${DAISY_MODEL_PATH:-/opt/daisy/model.gguf}"
export DAISY_INFERENCE_ENGINE="${DAISY_INFERENCE_ENGINE:-/usr/local/bin/llama-cli}"
export DAISY_MODEL_ID="${DAISY_MODEL_ID:-HuggingFaceTB/SmolLM2-135M-Instruct}"
export DAISY_MODEL_VERSION="${DAISY_MODEL_VERSION:-loc-grammar-q4_k_m}"

python3 scripts/fetch_daisy_model_release.py
test -s "$DAISY_MODEL_PATH"
test -x "$DAISY_INFERENCE_ENGINE"

exec bash ./fly-start.sh
