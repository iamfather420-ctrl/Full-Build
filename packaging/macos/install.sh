#!/usr/bin/env bash
set -euo pipefail
ROOT="${AI_OS_INSTALL_DIR:-$HOME/Daisy-AI-OS}"
SOURCE="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$ROOT" "$HOME/Library/LaunchAgents"
rsync -a --delete --exclude .git --exclude node_modules "$SOURCE/" "$ROOT/"
(cd "$ROOT" && npm install --omit=dev)
PLIST="$HOME/Library/LaunchAgents/com.daisy.ai-os.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.daisy.ai-os</string>
<key>WorkingDirectory</key><string>$ROOT</string>
<key>ProgramArguments</key><array><string>/usr/local/bin/npm</string><string>run</string><string>aios:server</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
</dict></plist>
EOF
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Daisy AI OS installed at $ROOT and listening on http://127.0.0.1:8787"
