#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-dist/Daisy-AI-OS-live.iso}"
for tool in live-build xorriso; do command -v "$tool" >/dev/null || { echo "Missing required tool: $tool. Install Debian live-build and xorriso on a Linux build host." >&2; exit 2; }; done
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/config/includes.chroot/opt/daisy-ai-os"
cp -a "$(cd "$(dirname "$0")/../.." && pwd)"/. "$WORK/config/includes.chroot/opt/daisy-ai-os/"
cat > "$WORK/config/package-lists/aios.list.chroot" <<'EOF'
nodejs
npm
openssh-server
EOF
(cd "$WORK" && lb config --distribution bookworm --archive-areas "main contrib non-free-firmware" && lb build)
mkdir -p "$(dirname "$OUT")"
cp "$WORK/live-image-amd64.hybrid.iso" "$OUT"
echo "Created bootable ISO: $OUT"
