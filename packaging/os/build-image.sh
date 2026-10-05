#!/usr/bin/env bash
set -euo pipefail
if [ "${EUID}" -ne 0 ]; then exec sudo -E "$0" "$@"; fi
unset LIVE_BUILD
ARCH="${1:-amd64}"
OUT="${2:-dist/os/Daisy-AI-OS-${ARCH}.iso}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${ROOT}/.os-build/${ARCH}"
case "$ARCH" in amd64|arm64) ;; *) echo "Usage: $0 amd64|arm64 [output.iso]" >&2; exit 2 ;; esac
for tool in lb xorriso debootstrap; do command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 2; }; done
rm -rf "$WORK"
mkdir -p "$WORK/auto" "$WORK/config/package-lists" "$WORK/config/includes.chroot/opt/daisy/bin" "$WORK/config/includes.chroot/etc/systemd/system" "$WORK/config/includes.chroot/etc/xdg/autostart" "$WORK/config/hooks/normal"
RUNTIME="$ROOT/dist/native-release/Daisy-AI-OS-linux-x64"
KERNEL="linux-image-amd64"
HEADERS="linux-headers-amd64"
IMAGE_MODE="iso"
if [ "$ARCH" = arm64 ]; then RUNTIME="$ROOT/dist/native-release/Daisy-AI-OS-linux-arm64"; KERNEL="linux-image-arm64"; HEADERS="linux-headers-arm64"; fi
test -s "$RUNTIME" || { echo "Missing native runtime: $RUNTIME" >&2; exit 2; }
cp "$RUNTIME" "$WORK/config/includes.chroot/opt/daisy/bin/daisy-ai-os"
chmod 0755 "$WORK/config/includes.chroot/opt/daisy/bin/daisy-ai-os"
cat > "$WORK/config/package-lists/desktop.list.chroot" <<EOF
$KERNEL
$HEADERS
systemd-sysv
live-boot
live-config
sudo
network-manager
wireless-tools
wpasupplicant
firmware-linux
firmware-linux-nonfree
firmware-iwlwifi
firmware-realtek
firmware-atheros
firmware-brcm80211
xfce4
xfce4-goodies
lightdm
xorg
xserver-xorg-video-all
xserver-xorg-input-all
mesa-utils
firefox-esr
policykit-1
udisks2
upower
bluez
pipewire
pipewire-audio
iptables
nftables
pciutils
usbutils
hwinfo
curl
ca-certificates
EOF
if [ "$ARCH" = arm64 ]; then
  IMAGE_MODE="tar"
  printf '%s\n' grub-efi-arm64-bin >> "$WORK/config/package-lists/desktop.list.chroot"
fi
cat > "$WORK/config/includes.chroot/etc/systemd/system/daisy-ai-os.service" <<'EOF'
[Unit]
Description=Daisy AI OS Runtime
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
ExecStart=/opt/daisy/bin/daisy-ai-os
Restart=on-failure
RestartSec=2
User=daisy
Group=daisy
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/daisy-ai-os
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
[Install]
WantedBy=multi-user.target
EOF
cat > "$WORK/config/includes.chroot/etc/xdg/autostart/daisy-ai-os.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Daisy AI OS
Comment=Open the Daisy AI OS control panel
Exec=firefox-esr --new-window http://127.0.0.1:8787
Terminal=false
X-GNOME-Autostart-enabled=true
EOF
cat > "$WORK/config/hooks/normal/050-daisy.hook.chroot" <<'EOF'
#!/bin/sh
set -eu
useradd --system --home-dir /var/lib/daisy-ai-os --create-home --shell /usr/sbin/nologin daisy || true
install -d -o daisy -g daisy -m 0750 /var/lib/daisy-ai-os
systemctl enable NetworkManager.service
a systemctl enable lightdm.service 2>/dev/null || true
systemctl enable daisy-ai-os.service
printf 'daisy ALL=(ALL) NOPASSWD: /usr/bin/hwinfo, /usr/bin/lspci, /usr/bin/lsusb\n' > /etc/sudoers.d/daisy-hardware
chmod 0440 /etc/sudoers.d/daisy-hardware
EOF
# fix accidental shell token defensively
sed -i 's/^a systemctl/systemctl/' "$WORK/config/hooks/normal/050-daisy.hook.chroot"
chmod +x "$WORK/config/hooks/normal/050-daisy.hook.chroot"
cat > "$WORK/auto/config" <<EOF
#!/bin/sh
lb config noauto \\
 --distribution bookworm \\
 --archive-areas "main contrib non-free-firmware" \\
 --security false \\
 --keyring-packages debian-archive-keyring \\
 --firmware-chroot false \\
 --mirror-bootstrap http://deb.debian.org/debian/ \\
 --mirror-chroot http://deb.debian.org/debian/ \\
 --mirror-chroot-security http://deb.debian.org/debian-security/ \\
 --mirror-binary http://deb.debian.org/debian/ \\
 --mirror-binary-security http://deb.debian.org/debian-security/ \\
 --architectures "$ARCH" \\
 --linux-packages linux-image \\
 --linux-flavours "$ARCH" \\
 --initramfs live-boot \\
 --initsystem systemd \\
 --binary-images "$IMAGE_MODE" \\
 --bootloader grub \\
 --bootappend-live "boot=live components quiet splash" \\
 --debian-installer false \\
 --apt-recommends true \\
 --memtest none
EOF
chmod +x "$WORK/auto/config"
mkdir -p "$WORK/config/archives"
cat > "$WORK/config/archives/security.list.chroot" <<'EOF'
deb http://deb.debian.org/debian-security bookworm-security main contrib non-free-firmware
EOF
(cd "$WORK" && ./auto/config)
if [ "$ARCH" = arm64 ]; then
  mkdir -p "$WORK/bin"
  printf '#!/bin/sh\nexit 0\n' > "$WORK/bin/lb_binary_grub"
  printf '#!/bin/sh\nexit 0\n' > "$WORK/bin/lb_binary_iso"
  chmod +x "$WORK/bin/lb_binary_grub" "$WORK/bin/lb_binary_iso"
  (cd "$WORK" && PATH="$WORK/bin:$PATH" LIVE_BUILD=/usr/share/live/build lb build)
  mkdir -p "$WORK/binary/boot/grub"
  cat > "$WORK/binary/boot/grub/grub.cfg" <<'EOF'
set timeout=5
set default=0
menuentry 'Daisy AI OS (ARM64)' {
  linux /live/vmlinuz boot=live components quiet splash
  initrd /live/initrd.img
}
EOF
  grub-mkrescue -o "$WORK/binary.iso" "$WORK/binary"
else
  (cd "$WORK" && LIVE_BUILD=/usr/share/live/build lb build)
fi
mkdir -p "$(dirname "$ROOT/$OUT")"
if [ -f "$WORK/binary.iso" ]; then cp "$WORK/binary.iso" "$ROOT/$OUT"; else cp "$WORK"/live-image-*.iso "$ROOT/$OUT"; fi
sha256sum "$ROOT/$OUT" > "$ROOT/$OUT.sha256"
echo "Created bootable image: $ROOT/$OUT"
