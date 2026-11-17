# Daisy Complete Model and Brain Wiring Audit

**Audit date:** 2026-11-16  
**Audited branch:** `feat/daisy-ecosystem-link-20261116`  
**Audited Full-Build head at inspection:** `cad8feff6a4f6bf7af957854f568132e23c3e92d`  
**Related Discover-Engine PR:** `iamfather420-ctrl/Discover-Engine#8` at `d4ee8395855a97cceddcc9956b0c973825f0b0df`

## Executive summary

The repositories contain meaningful pre-existing Daisy components. The current Full-Build PR adds a tested CPU reference weight engine, a local evidence gate, a build ledger, a Discover-Engine HTTP client, and a scenario joining those pieces. It does **not** yet connect the complete existing 54-node brain, a canonical 120-synapse topology, Learning Bubble lifecycle, and a usable Daisy language-model runtime into one operational learning system.

The strongest immediate engineering opportunity is to reuse the existing 54-node registry and executor, connect the actual inference runtime when its model and executable are supplied, and add a real, provenance-aware Learning Bubble and synapse-graph runtime. The original authoritative 120-edge topology was not found in the scanned Full-Build tree; it must not be fabricated.

## Repository and PR state observed

### Full-Build

- Repository: `iamfather420-ctrl/Full-Build`
- PR: [#127](https://github.com/iamfather420-ctrl/Full-Build/pull/127)
- Branch: `feat/daisy-ecosystem-link-20261116`
- Head: `cad8feff6a4f6bf7af957854f568132e23c3e92d`
- Base: `main` at `978126b7e1cca45cf4d60e2444a9254e3e5e87f3`
- State: open, unmerged; GitHub reports mergeable.
- Changed files in PR #127: 25.
- Current reported CI workflows for this exact head: Build and Enterprise CI (1437), Authoritative 120-Case Verification (1348), and Formal evidence hash stability (886) all completed successfully. The Vercel status is successful.
- These successful workflows do not establish that every production gate passed.

### Discover-Engine

- Repository: `iamfather420-ctrl/Discover-Engine`
- PR: [#8](https://github.com/iamfather420-ctrl/Discover-Engine/pull/8)
- Branch: `feat/authenticated-assertion-api`
- Head: `d4ee8395855a97cceddcc9956b0c973825f0b0df`
- State: open, unmerged; GitHub reports mergeable.
- Discover Engine CI run 88 completed successfully.
- The API is an authenticated assertion-passage review endpoint. It is not a general-purpose unrestricted scientific fact-verification API. Its current contract always returns `publishable: false` and `withheld: true`; a passage-matching abstract receives `human_review_required`, while invalid passage evidence receives `insufficient_evidence`.

### Evidence repository

- `Solvex-Paradox-Box/daisy-haminja-120-evidence` was not changed by PR #127 or PR #8.

## Existing brain architecture found

### 54-node architecture

The branch contains:
- `src/nodes/NodeRegistry.ts` — bootstraps 54 node definitions, DN-01 through DN-54.
- `src/nodes/DaisySubsystemExecutors.ts` — switch-based executor for the 54 node IDs.
- `src/brain/DaisyBrain.ts` — brain state, activation-gate checks, and reasoning-kernel facade.
- `src/brain/DaisyReasoningKernel.ts` — composite reasoning candidates and generic tether-edge input.
- `src/brain/DaisyActivationGate.ts` — signed, freshness-bound activation evidence contract.
- `artifacts/daisy-54-node-canonical.json` and `artifacts/daisy-54-node-execution.json`.
- `src/tests/daisy54NodeCoverage.ts`.

The canonical artifact reports 54 registered/instantiated/reachable/executed nodes, 51 code-executed nodes, two external-provider requirements, and one policy-prohibited block. The execution artifact says `all_passed: true`, while its detailed results also include `FAIL_CLOSED` and `PROVIDER_REQUIRED` statuses. The meaning of the aggregate `all_passed` flag must be reconciled before treating it as proof that all nodes are operational.

### Important distinction: 120 paradox corpus is not 120 synapses

The code currently defines:
- `REAL_88_PARADOX_REGISTRY` in `src/data/paradoxData.ts`.
- A 32-item DH bootstrap registry in `src/paradoxes/DHBootstrapParadoxRegistry.ts`.
- `DaisyActivationGate` requires a corpus of 120 items composed of 88 DFRL and 32 DH items, with 120 executions and deterministic replays.

That 120 count is explicitly a paradox/proof corpus count in the activation-gate schema. It is not evidence of a 120-edge synapse graph.

A repository-tree scan found no dedicated canonical 120-synapse registry or 120-edge topology file. `DaisyReasoningKernel.ts` accepts caller-supplied `TetherEdge[]`, but does not itself define, persist, or validate a canonical set of 120 synapses.

Do not generate arbitrary edges to satisfy a count. Recover the original topology from authoritative source material before declaring all 120 synapses implemented.

### Learning Bubble / tether findings

The Android project contains:
- `app/src/main/java/com/example/data/model/TetherBubble.kt` — a Room entity with text, source screen, timestamp, and selection flag.
- `app/src/main/java/com/example/engine/TetherManager.kt` — browser/session tether management and token transfer.
- `app/src/main/java/com/example/data/DaisyEntities.kt` — tether nodes, ingress files, discovery links, consensus tasks, and logs.

These are useful foundations, but the inspected `TetherBubble` entity does not yet model evidence provenance, verification status, paradox/node associations, synapse links, training eligibility, version history, or contradiction state. The inspected `TetherManager` manages tethered external UI sessions; it is not the 120-edge cognitive synapse runtime.

### Historical architecture note

`.agents/memory/brain-architecture.md` describes a separate 59-paradox / five-chamber architecture and points to `artifacts/solvex/src/data/brainData.ts`. This differs from the 54-node registry and 88+32 (120-item) formal corpus. These are different concepts and versions; reconcile their lineage rather than silently merging their counts.

## Actual language-model runtime findings

- `src/inference/InferenceRuntime.ts` defines the first-party inference contract and explicitly distinguishes generative inference from formal proof and deterministic application logic.
- `src/inference/LocalInferenceRuntime.ts` is a real CLI adapter requiring `DAISY_MODEL_PATH` and `DAISY_INFERENCE_ENGINE`. It checks that the model is a readable non-empty file and that the engine is executable, then invokes the engine.
- `src/inference/InferenceRouter.ts` fails closed when the local runtime is unavailable; it does not invent a response.
- `src/brain/FirstPartyInferenceRuntime.ts` is currently a stub: even when enabled/configured, its health check returns `FIRST_PARTY_INFERENCE_NOT_IMPLEMENTED`.
- The current workspace report found no GGUF model file and no configured `DAISY_MODEL_PATH` or `DAISY_INFERENCE_ENGINE`. No evidence in this audit establishes an actual loaded Daisy language model.
- `daisy-ai-os/src/native-os/runtime/DaisyRuntime.ts` is a separate lightweight lifecycle runtime; its `boot()` method changes activation to ACTIVE but does not load a language model or verify the signed brain activation gate. It must not be mistaken for the inference engine.

## Weight Engine findings

- `packages/daisy-weight-engine/` contains architecture, kernel, planner, assembler, training, serialization, and tests.
- Its README identifies it as a deterministic CPU reference implementation for dense MLP tensor weights, not a pretrained language model or transformer/GGUF runtime.
- `src/orchestration/DaisyEcosystem.ts` trains a small 2→8→1 MLP, records CPU shards, attempts a GPU task that is blocked without a provider, assembles the MLP, and writes the artifact to a temporary directory.
- The scenario probes `LocalInferenceRuntime` but does not currently invoke the 54-node executor, use the Learning Bubble model, or traverse a canonical synapse graph.
- This validates a reference training path, not full-scale language-model training or a persistent Daisy model release.

## Discovery Engine integration findings

- `src/discovery/DiscoverEngineClient.ts` submits an HTTP POST to `/v1/assertions` using a bearer token.
- `src/orchestration/DaisyEcosystem.ts` can call that client when a URL and token are provided.
- Discover-Engine PR #8 adds `POST /v1/assertions`, checks a minimum 32-character bearer token using a timing-safe comparison, returns 503 when the token is not configured, and 401 for invalid authentication.
- `reviewAssertion()` delegates to the existing passage checker and deliberately never publishes a claim.
- The current integration is a real service call in the PR's test, but it is an assertion-passage review API, not yet a complete research orchestration contract with search, solver consensus, and training-data export.
- Daisy's current client trusts the response shape after JSON parsing; response-schema validation, request IDs, correlation IDs, retries/backoff policy, and explicit timeout/error classification should be added before production use.

## Dipstick and persistence findings

- `src/dipstick/BuildLedger.ts` supports one active in-memory build, duplicate task rejection, task state, and artifact SHA-256.
- The current ledger is process-memory state; it is not durable across restarts.
- `packages/db/migrations/0002_daisy_orchestration_draft.sql` is explicitly draft-only and creates build/task/event tables, but not the complete brain, synapse, bubble, model-artifact, checkpoint, or worker schema.
- The migration has not been applied to the live Neon registry.
- No configured object-storage bucket for large model artifacts was established.

## SwarmForge findings

- `src/swarm/SwarmForge.ts` provides a small in-process worker registry and shard dispatch abstraction.
- GPU workers are deliberately blocked; no actual GPU pool/provider or distributed worker runtime was found in the inspected architecture.
- CPU shard task records are routed through the in-memory Dipstick ledger.
- This is not yet a distributed GPU training cluster.

## Critical integration gaps

1. The 54-node registry/executor is not invoked by the current `DaisyEcosystem` scenario.
2. No canonical 120-synapse topology was found. The 120-item activation corpus is 88+32 paradox records, not synapse edges.
3. Learning Bubble persistence is too minimal for verified recursive learning.
4. The actual Daisy language model is unavailable in the inspected workspace; `FirstPartyInferenceRuntime` is a stub and the CLI runtime requires external model/engine artifacts.
5. Discovery-Engine integration currently covers authenticated assertion passage review, not the full research/solver/training-data lifecycle.
6. The Weight Engine is an MLP reference trainer, not transformer/GGUF-compatible model training.
7. Dipstick is in-memory rather than durable.
8. SwarmForge has no configured distributed GPU cluster.
9. Neon migration and object storage are not configured/applied.
10. Stage 14 live Fly gateway remains on the old allowlist until an approved deployment.
11. The 46-gate suite has not been rerun for this integration state.

## Recommended implementation order

1. Preserve PR #127 and #8 unmerged; keep production closed and payments disabled.
2. Reconcile the 54-node artifacts with actual executor outcomes and correct any misleading aggregate pass semantics.
3. Define a versioned brain-graph contract that loads the authoritative 54 nodes and requires an externally supplied, source-backed 120-synapse manifest. Fail closed if the manifest is absent or invalid.
4. Implement a provenance-aware Learning Bubble lifecycle and tests; keep unverified bubbles ineligible for training.
5. Connect Daisy orchestration to the brain graph, node executor, Learning Bubble store, Discovery Engine client, Weight Engine, and inference router through typed interfaces.
6. Add strict response validation and request correlation to Discover-Engine client; extend Discover-Engine only with explicitly scoped, authenticated endpoints and preserve its no-publication rule.
7. Keep MLP training clearly labeled as reference-only. Do not attempt transformer training until compatible architecture, data, memory, and compute are verified.
8. Obtain and verify an authorized GGUF artifact and compatible executable runtime before claiming Daisy language-model inference is ready.
9. Make Dipstick durable only after reviewed schema/migration and backup plan; use object storage for large artifacts.
10. Implement distributed GPU workers only after a real provider/runtime is configured.
11. Resolve Stage 14 through approved Fly deployment; then run the 46-gate suite on exact final commits.

## Safety and release posture

Production remains closed. Payments remain disabled. Do not merge PRs, apply live Neon migrations, deploy Fly, enable payment capture, bypass OIDC, weaken RLS, fabricate model artifacts, invent synapse edges, or manually mark gates passed.

This audit is a source-tree and GitHub inspection report, not a production certification.

## Work completed during this ChatGPT session

The following files were committed directly to the existing PR #127 branch after the source audit:

- `docs/audits/DAISY_COMPLETE_MODEL_BRAIN_WIRING_AUDIT.md` — this audit.
- `src/brain/DaisyBrainGraph.ts` — typed 54-node/120-synapse manifest contract and fail-closed validator. It refuses missing, duplicate, malformed, unreferenced, or non-source-backed edges; it does not invent topology.
- `src/brain/LearningBubbleRegistry.ts` — provenance-aware Learning Bubble lifecycle, revision/version tracking, evidence and paradox/node/synapse references, licensing and verification state, contradiction tracking, and strict training eligibility.
- `src/brain/LearningBubbleRegistry.test.ts` — tests for training eligibility, source/captured-content hash mismatch, revisions, and missing 120-edge topology.
- `package.json` — includes the new brain/Learning Bubble tests in `test:ecosystem`.

The Learning Bubble implementation currently uses an injectable store interface with an in-memory implementation for tests. It is not yet durable across restarts; a reviewed Neon/SQLite adapter remains future work. The graph validator is implemented, but no authoritative 120-synapse manifest has been found or loaded, so the graph cannot yet be instantiated as Daisy's canonical topology.

The latest observed PR head after these commits is `7485d2439937d2a8cfcf10437dadd8ec8fef27dc`. At the time of the final check, the Vercel status for this head was pending and no GitHub Actions workflow run had yet appeared for this exact head. The newly added tests have therefore **not** been claimed as passing in CI.

## Follow-up on 2026-11-16 after `fcc7a1f`

A second source search of Full-Build and `Solvex-Paradox-Box/daisy-haminja-120-evidence` still found no 120-edge synapse manifest. The graph validator continues to reject a missing manifest, and no edges were generated.

`FileLearningBubbleStore` persists bubbles as local JSON files and was tested across a new store instance. That store is not the live Neon database. An unreviewed bubble remained ineligible for training.

The ecosystem scenario now executes node DN-01 through `DaisySubsystemExecutors` and records that this one local result does not make the other 53 nodes operational. The language-model probe remains blocked because no GGUF artifact or inference executable is configured. The CPU MLP remains a reference model only.

Discover-Engine now returns `HUMAN_REVIEW_REQUIRED` or `INSUFFICIENT_EVIDENCE`, always with `WITHHELD` and `publishable: false`. It still cannot emit `VERIFIED` for an abstract.

## Local 54-node run after the CI typecheck failure

The three Full-Build workflows on `e16830a` failed typecheck because `src/brain/FileLearningBubbleStore.test.ts` imported `.ts` extensions. That import was removed.

A local call to `executeAll54Nodes()` attempted all 54 cases. In that run the result counts were 23 `SUCCESS`, 27 `FAIL_CLOSED`, 3 `PROVIDER_REQUIRED`, and 1 `PROHIBITED_BLOCKED` (`DN-36`). `executed: true` means the case ran. It does not mean the node is operational. No GGUF model was loaded. No GPU workload ran. The 120-edge manifest was still absent. A separate CPU attention demo reduced toy loss; it is not transformer language-model training.


