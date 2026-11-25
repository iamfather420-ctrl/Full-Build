#!/usr/bin/env bash
# Adapter for Full-Build's local inference contract:
#   daisy-infer --model <gguf> --prompt <text>
# llama-cli itself does not accept those flags.
set -euo pipefail

MODEL=""
PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="${2:-}"; shift 2 ;;
    --prompt) PROMPT="${2:-}"; shift 2 ;;
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

LLAMA_CLI="${DAISY_LLAMA_CLI:-llama-cli}"
if ! command -v "$LLAMA_CLI" >/dev/null 2>&1 && [[ ! -x "$LLAMA_CLI" ]]; then
  echo "BLOCKED: llama-cli is not executable" >&2
  exit 2
fi

exec "$LLAMA_CLI" -m "$MODEL" -p "$PROMPT" -n 64 --temp 0 --no-display-prompt
