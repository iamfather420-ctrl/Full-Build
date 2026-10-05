#!/usr/bin/env bash
set -euo pipefail
ROOT="${AI_OS_INSTALL_DIR:-$HOME/Daisy-AI-OS}"
SOURCE="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$ROOT"
rsync -a --delete --exclude .git --exclude node_modules "$SOURCE/" "$ROOT/"
cd "$ROOT"
npm install --omit=dev
mkdir -p "$HOME/.config/systemd/user"
cp packaging/linux/daisy-ai-os.service "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now daisy-ai-os.service
echo "Daisy AI OS installed at $ROOT and listening on http://127.0.0.1:8787"
