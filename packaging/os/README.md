# Daisy AI OS bootable images

This is the first standalone OS distribution layer: a Debian live image with the Linux kernel, broad firmware/driver coverage, XFCE desktop, LightDM, NetworkManager, hardware inspection utilities, and the embedded Daisy AI runtime.

## Build

```bash
npm run os:build:x86
npm run os:build:arm64
```

The x86_64 image is a standard GRUB El Torito ISO designed for UEFI/BIOS PCs and QEMU. It is not marked with the syslinux-specific `isohybrid` extension. The generic ARM64 profile is intended for UEFI ARM64 hardware and virtual machines; board-specific ARM images require the board's device tree, boot firmware, and kernel support.

## Security model

The runtime runs as a dedicated `daisy` system user with `NoNewPrivileges`, private temporary storage, protected system/home paths, restricted network families, and a narrow hardware-inspection sudo policy. This is a baseline, not a security certification. Production release still requires signed packages, measured/secure boot, full update infrastructure, penetration testing, and hardware-specific validation.
