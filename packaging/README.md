# Daisy AI OS Platform Packaging

The runtime is shared across platforms; these targets provide native installation and launch adapters.

| Target | Artifact | Build host | Command |
|---|---|---|---|
| Linux | systemd service or bootable live ISO | Linux | `npm run package:linux` |
| Windows | PowerShell installer and launcher | Windows | `npm run package:windows` |
| macOS | LaunchAgent installer and app wrapper | macOS | `npm run package:macos` |
| Android | Gradle WebView client | Android SDK/Gradle host | `npm run package:android` |

The Linux ISO script fails closed when `live-build`/`xorriso` are absent instead of producing a non-bootable file. Windows/macOS/Android native artifacts must be built on their target toolchains for signing and OS integration.

All adapters launch the same local runtime API at `http://127.0.0.1:8787` unless `AI_OS_ENDPOINT` is configured.
