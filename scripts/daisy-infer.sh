#!/usr/bin/env bash
# Adapter for Full-Build's local inference contract:
#   daisy-infer --model <gguf> --prompt <text>
# llama-cli itself does not accept those flags.
set -euo pipefail

MODEL=""
PROMPT=""
MAX_TOKENS=64
TEMPERATURE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="${2:-}"; shift 2 ;;
    --prompt) PROMPT="${2:-}"; shift 2 ;;
    --max-tokens) MAX_TOKENS="${2:-}"; shift 2 ;;
    --temperature) TEMPERATURE="${2:-}"; shift 2 ;;
    *) echo "BLOCKED: unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$MODEL" || ! -s "$MODEL" ]]; then
  echo "BLOCKED: model file is missing or empty" >&2
  exit 2
fi
if [[ -z "$PROMPT" ]]; then
  echo "BLOCKED: prompt is required" >&2
  exit 2
fi

if ! [[ "$MAX_TOKENS" =~ ^[1-9][0-9]{0,3}$ ]] || (( MAX_TOKENS > 2048 )); then
  echo "BLOCKED: max-tokens must be an integer from 1 to 2048" >&2
  exit 2
fi
if ! [[ "$TEMPERATURE" =~ ^([0-1]([.][0-9]+)?|2([.]0+)?)$ ]]; then
  echo "BLOCKED: temperature must be between 0 and 2" >&2
  exit 2
fi

LLAMA_CLI="${DAISY_LLAMA_CLI:-llama-cli}"
if ! command -v "$LLAMA_CLI" >/dev/null 2>&1 && [[ ! -x "$LLAMA_CLI" ]]; then
  echo "BLOCKED: llama-cli is not executable" >&2
  exit 2
fi

exec "$LLAMA_CLI" -m "$MODEL" -p "$PROMPT" -n "$MAX_TOKENS" --temp "$TEMPERATURE" --no-display-prompt --simple-io
