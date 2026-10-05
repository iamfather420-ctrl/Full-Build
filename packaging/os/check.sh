#!/usr/bin/env bash
set -euo pipefail
for f in packaging/os/build-image.sh packaging/os/README.md; do test -s "$f" || { echo "Missing $f" >&2; exit 1; }; done
for c in lb xorriso debootstrap qemu-system-x86_64; do command -v "$c" >/dev/null || { echo "Missing tool: $c" >&2; exit 2; }; done
bash -n packaging/os/build-image.sh
for iso in dist/os/Daisy-AI-OS-amd64.iso dist/os/Daisy-AI-OS-arm64.iso; do
  test -s "$iso" || { echo "Missing image: $iso" >&2; exit 3; }
  test -s "$iso.sha256" || { echo "Missing checksum: $iso.sha256" >&2; exit 3; }
  sha256sum -c "$iso.sha256" >/dev/null
  xorriso -indev "$iso" -toc 2>&1 | grep -q 'Boot record' || { echo "Image is not bootable: $iso" >&2; exit 4; }
done
printf 'OS image build tooling and scripts validated.\n'
