# Daisy AI OS Runtime

This repository now includes a portable, permissioned AI operating layer that runs anywhere Node.js runs: Linux, Windows, macOS, containers, CI, and browser/mobile clients through its HTTP API.

## Capabilities

- Offline deterministic assistant mode
- OpenAI-compatible model routing through `OPENAI_API_KEY`, `OPENAI_API_BASE`, and `AI_OS_MODEL`
- Persistent JSONL memory
- Hash-chained audit log
- Workspace-confined file tools
- Permission-gated system information, memory, file, and process tools
- Cross-platform local HTTP API
- CLI suitable for desktop shells, terminals, launchers, and automation

## Run

```bash
npm install
npm run aios:server
# separate terminal
npm run aios -- status
npm run aios -- ask "Summarize the current runtime status"
curl http://localhost:8787/runtime/status
```

Grant additional capabilities explicitly:

```bash
AI_OS_PERMISSIONS=system.info,memory.read,memory.write,files.read,files.write,process.exec npm run aios:server
```

The runtime is the portable core. Native installers, a bootable Linux image, and platform-specific GUI shells are packaging/adapters around this same core; they cannot be honestly represented as one universal binary because OS kernel, driver, sandbox, and permission models differ.
