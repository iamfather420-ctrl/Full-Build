#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/packages}"
rm -rf "$OUT"
mkdir -p "$OUT" "$OUT/macos/Daisy AI OS.app/Contents/MacOS" "$OUT/macos/Daisy AI OS.app/Contents/Resources"
# Linux portable distribution
mkdir -p "$OUT/linux/Daisy-AI-OS"
tar -C "$ROOT" --exclude=.git --exclude=node_modules --exclude=dist --exclude='runtime/data/*.jsonl' -cf - . | tar -C "$OUT/linux/Daisy-AI-OS" -xf -
tar -C "$OUT/linux" -czf "$OUT/Daisy-AI-OS-linux.tar.gz" Daisy-AI-OS
# Windows portable distribution
mkdir -p "$OUT/windows/Daisy-AI-OS"
tar -C "$ROOT" --exclude=.git --exclude=node_modules --exclude=dist --exclude='runtime/data/*.jsonl' -cf - . | tar -C "$OUT/windows/Daisy-AI-OS" -xf -
cp "$ROOT/packaging/windows/install.ps1" "$OUT/windows/Install-Daisy-AI-OS.ps1"
(cd "$OUT/windows" && zip -qr "$OUT/Daisy-AI-OS-windows.zip" Daisy-AI-OS Install-Daisy-AI-OS.ps1)
# macOS app wrapper distribution
cat > "$OUT/macos/Daisy AI OS.app/Contents/MacOS/Daisy-AI-OS" <<LAUNCH
#!/usr/bin/env bash
cd "\$(dirname "\$0")/../../../.."
exec npm run aios:server
LAUNCH
chmod +x "$OUT/macos/Daisy AI OS.app/Contents/MacOS/Daisy-AI-OS"
cat > "$OUT/macos/Daisy AI OS.app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleName</key><string>Daisy AI OS</string><key>CFBundleIdentifier</key><string>com.daisy.ai-os</string><key>CFBundleExecutable</key><string>Daisy-AI-OS</string><key>CFBundleVersion</key><string>0.1.0</string></dict></plist>
PLIST
(cd "$OUT/macos" && zip -qr "$OUT/Daisy-AI-OS-macos-app.zip" "Daisy AI OS.app")
# Android source package
(cd "$ROOT/packaging" && zip -qr "$OUT/Daisy-AI-OS-android-source.zip" android)
# Bootable ISO source/build workspace
(cd "$ROOT" && zip -qr "$OUT/Daisy-AI-OS-live-iso-build.zip" packaging/linux packaging/README.md AI-OS-RUNTIME.md)
rm -rf "$OUT/linux" "$OUT/windows" "$OUT/macos"
printf 'Created platform bundles in %s:\n' "$OUT"
find "$OUT" -maxdepth 1 -type f -printf '%f %s bytes\n' | sort
