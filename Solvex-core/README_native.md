# SolveX Core Native Server

The native server entrypoint is governed by the first-party-only inference boundary. It uses the repository's local InferenceRouter; it does not call a third-party AI API or accept an external model-provider key.

## Runtime requirements

- Node.js 22 or the repository-pinned runtime
- A verified local model artifact
- An executable local inference engine configured on the host

Configure the server with the verified local runtime paths and identity:

- DAISY_MODEL_PATH
- DAISY_INFERENCE_ENGINE
- DAISY_MODEL_ID
- DAISY_MODEL_VERSION

A model file or engine path is not proof that inference works. The runtime must pass its checksum, execution, and output-validation checks. If the local runtime or foundational instruction is unavailable, Daisy returns an explicit BLOCKED result. No remote AI fallback or simulated reply is used.

## Repository commands

Run commands from the repository root so the committed Bun lockfile and root package scripts remain authoritative:

- bun run test:local-inference
- bun run verify:release-safety
- bun run build

The retained package_native.json is not a standalone package-manager lockfile. Do not run an independent install in this subdirectory.

## Release boundary

This documentation does not authorize production deployment, model activation, payment activation, or changes to the human root of trust.
