#!/usr/bin/env bash
set -euo pipefail

export DAISY_MODEL_PATH="${DAISY_MODEL_PATH:-/opt/daisy/model.gguf}"
export DAISY_INFERENCE_ENGINE="${DAISY_INFERENCE_ENGINE:-/app/scripts/daisy-infer.sh}"
export DAISY_MODEL_ID="${DAISY_MODEL_ID:-HuggingFaceTB/SmolLM2-135M-Instruct}"
export DAISY_MODEL_VERSION="${DAISY_MODEL_VERSION:-d158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd}"

chmod +x /app/scripts/daisy-infer.sh
mkdir -p "$(dirname "$DAISY_MODEL_PATH")"

# Normalize supported Neon connection-string names without printing credentials.
# A missing database URL must block authenticated data operations, not HTTP startup.
if [[ -z "${DATABASE_URL:-}" && -n "${NEON_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="$NEON_DATABASE_URL"
  echo "register_database_url: mapped NEON_DATABASE_URL -> DATABASE_URL"
elif [[ -z "${DATABASE_URL:-}" && -n "${Database_url:-}" ]]; then
  export DATABASE_URL="$Database_url"
  echo "register_database_url: mapped Database_url -> DATABASE_URL"
elif [[ -z "${DATABASE_URL:-}" && -n "${DATABASE_URL_FALLBACK:-}" ]]; then
  export DATABASE_URL="$DATABASE_URL_FALLBACK"
  echo "register_database_url: mapped DATABASE_URL_FALLBACK -> DATABASE_URL"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "startup: DATABASE_URL is missing; server will start, but database-backed/authenticated operations remain unavailable"
fi

# Model retrieval and checksum verification run independently of the HTTP listener.
# No inference is permitted until the existing loader verifies the exact pinned artifact.
STATUS_FILE=/tmp/daisy-model-status.json
STATUS_TMP=/tmp/daisy-model-status.json.tmp
printf '{"status":"MODEL_DOWNLOAD_PENDING"}\n' > "$STATUS_FILE"
(
  printf '{"status":"MODEL_DOWNLOAD_IN_PROGRESS"}\n' > "$STATUS_TMP"
  mv "$STATUS_TMP" "$STATUS_FILE"
  if python3 /app/scripts/fetch_daisy_model_release.py; then
    printf '{"status":"MODEL_FILE_VERIFIED"}\n' > "$STATUS_TMP"
    mv "$STATUS_TMP" "$STATUS_FILE"
  else
    printf '{"status":"MODEL_VERIFICATION_FAILED"}\n' > "$STATUS_TMP"
    mv "$STATUS_TMP" "$STATUS_FILE"
    echo "startup: Daisy model download or integrity verification failed; inference remains blocked" >&2
  fi
) &

if [[ ! -x "${DAISY_LLAMA_CLI:-/usr/local/bin/llama-cli}" ]]; then
  echo "startup: llama-cli is missing or not executable; health remains available, inference is blocked" >&2
fi

# Start HTTP immediately. /healthz is liveness; /readyz reports dependencies separately.
exec bun /app/server.ts
