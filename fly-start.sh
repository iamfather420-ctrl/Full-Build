#!/usr/bin/env bash
# fly-start.sh
# Boot wrapper for the Fly.io container.
# 1. Register the Neon database URL (NEON_DATABASE_URL -> DATABASE_URL)
# 2. Launch the API server on PORT 8080

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=register_database_url.sh
source "$DIR/register_database_url.sh"

exec bun x tsx artifacts/api-server/src/index.ts
