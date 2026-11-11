#!/usr/bin/env bash
# fly-start.sh
# Normalize the Neon connection string, then run TypeScript directly with Bun.
# Bun supports TypeScript natively; this avoids invoking the tsx package at runtime.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=register_database_url.sh
source "$DIR/register_database_url.sh"

exec bun artifacts/api-server/src/outreach-index.ts
