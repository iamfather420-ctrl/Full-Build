# Daisy Haminja AI/UI/OS — File-Level Source Inventory

**Inventory date:** 2026-10-21  
**Primary inventory source:** `iamfather420-ctrl/Full-Build` (default branch `main`, tree SHA `a5ae6a4f928b80460519a9b493c1355916351967`).  
**Additional source:** `iamfather420-ctrl/SOLVEX-PARADOX-BOX` (default branch `main`, tree SHA `83f3fd9f9a7cc07c440e13c17818e6be271b9bee`).  
**Scope note:** this is a file-level inventory of Daisy-named files and directly related brain, OS, UI, execution, and test modules found in those repository trees. It is not a claim that every file in either large repository belongs to Daisy. Paths are exact repository paths. Purpose descriptions are based on filenames and inspected source excerpts; binary assets are identified by path/type. No files were copied or merged by this inventory.

## SOLVEX governance lifecycle — test coverage report

The source `src/lib/lifecycle.ts` defines 12 states and 26 legal directed transitions. The verification script `scripts/verify_governance_lifecycle.ts` exercises reachable paths via the public API and lists every edge it cannot exercise as an implementation gap. It does not mutate state directly or mark unimplemented paths as passed.

- Expected reachable paths covered by the script: PROPOSED → REVIEWED → AUTHORIZED → RUNNING → VALIDATING → COMPLETED; PROPOSED → REJECTED; REVIEWED → REJECTED; AUTHORIZED → BLOCKED → AUTHORIZED; VALIDATING → FAILED.
- Guardrails checked: Daisy cannot authorize HIGH-risk work; human review/owner authorization required; unavailable tools remain BLOCKED with a reason; failed validation is not completed; audit-chain integrity stays valid.
- Source-level gaps already visible: no public cancellation method despite CANCELLED edges; no public entry into NEEDS_REVIEW; no public FAILED → RECOVERY_REQUIRED recovery method; VALIDATING is advanced synchronously inside `run()`, so callers cannot intervene before COMPLETED/FAILED. The script prints actual transition/state counts and exact uncovered edges in CI.
- The test is not evidence of production execution or durable audit persistence; `Lifecycle` is currently an in-memory class and the audit digest in this file is a small FNV-style digest, not a cryptographic hash.

## Daisy Haminja files — Full-Build

| Path | Origin | Purpose |
|---|---|---|
| `DAISY_AI_OS.md` | `iamfather420-ctrl/Full-Build` | Top-level pointer to the unified Daisy AI OS directory and local startup instructions. |
| `daisy-ai-os/BUILD.txt` | same | Build/status note; records claimed 14/14 verification and target platform list. |
| `daisy-ai-os/package.json` | same | Scripts for running/verifying the Daisy OS and building native artifacts/images. |
| `daisy-ai-os/server.mjs` | same | Main local server entry point for the standalone Daisy AI OS. |
| `daisy-ai-os/src/brain/DaisyActivationGate.ts` | same | Activation gate for Daisy runtime capabilities. |
| `daisy-ai-os/src/native-os/permissions/PermissionKernel.ts` | same | Permission-checking layer for the native OS. |
| `daisy-ai-os/src/native-os/process/ProcessLayer.ts` | same | Process/runtime layer for native OS operations. |
| `daisy-ai-os/src/native-os/runtime/DaisyRuntime.ts` | same | Daisy native runtime implementation. |
| `daisy-ai-os/src/native-os/system-tools/SystemTools.ts` | same | System tool registry/operations for the native OS. |
| `daisy-ai-os/src/native-os/types.ts` | same | Shared types for native OS modules. |
| `src/brain/DaisyActivationGate.ts` | same | Main app activation gate; controls whether autonomous reasoning can activate. |
| `src/brain/DaisyBrain.ts` | same | Main brain facade/state report; reads registries, verification state, gateways, and activation gate. |
| `src/brain/DaisyReasoningKernel.ts` | same | Reasoning-kernel implementation used to propose composite candidates. |
| `src/components/DaisyBrainView.tsx` | same | UI view for the brain and 54-node mesh. |
| `src/components/DaisyFloat.tsx` | same | Floating Daisy assistant UI entry point. |
| `src/components/DaisyHaminjaAssistant.tsx` | same | Main interactive assistant component, including wake-word detection and controls. |
| `src/assets/images/daisy_avatar_portrait_1784658206570.jpg` | same | Daisy portrait asset. |
| `public/daisy-avatar_native.png` | same | Daisy avatar image asset. |
| `public/daisy-haminja_native.png` | same | Daisy Haminja image asset. |
| `public/daisy_avatar.jpg` | same | Daisy avatar image asset. |
| `public/img_daisy_core_icon_1782437282955.jpg` | same | Daisy core icon asset. |
| `public/img_daisy_hero_banner_1782437295189.jpg` | same | Daisy hero/banner asset. |
| `artifacts/solvex/public/daisy-avatar.png` | same | Daisy avatar asset used by the Solvex artifact app. |
| `artifacts/solvex/public/daisy-haminja.png` | same | Daisy Haminja artwork used by the Solvex artifact app. |
| `artifacts/solvex/src/components/DaisyAvatar.tsx` | same | Avatar UI component for the artifact app. |
| `artifacts/solvex/src/components/DaisyFloat_native.tsx` | same | Native/floating Daisy assistant component for the artifact app. |
| `src/lib/daisy-functions.ts` | same | Daisy tool/function catalogue and proposal adapter into the governance lifecycle. |
| `src/lib/daisyAdminInjector.ts` | same | Admin-guarded runtime patch/injection module. Requires security review before enabling mutation. |
| `src/lib/daisyAutonomousEngine.ts` | same | Autonomous orchestration/self-healing integration module. |
| `src/lib/daisyCoreEngine.ts` | same | Core Daisy engine module. |
| `src/lib/daisyProvisioner.ts` | same | Software provisioning/customization pipeline module. |
| `src/lib/daisySelfUpdater.ts` | same | Self-update/runtime patch module; requires tightly controlled authorization and rollback. |
| `src/lib/lifecycle.ts` | same | Governance task state machine, policy checks, and in-memory hash-linked audit entries. |
| `src/routes/lifecycle.tsx` | same | Lifecycle dashboard UI for propose/review/authorize/run and audit-chain display. |
| `src/routes/agents.tsx` | same | Agent route/UI supporting the agent interface. |
| `src/nodes/DaisySubsystemExecutors.ts` | same | Daisy subsystem executor implementations. |
| `src/tests/daisy54NodeCoverage.ts` | same | Coverage checks for the Daisy 54-node subsystem. |
| `proof-before-power/public/agents/daisy-haminja.mjs` | same | Proof-before-power agent policy: Daisy can propose but not execute or grade proof. |
| `proof-before-power/public/agents/daisy-haminja.test.mjs` | same | Tests for the proof-before-power Daisy agent. |
| `src/converted_app/logic/DaisyCoreConsole.ts` | same | Converted/ported Daisy console logic. |
| `src/converted_app/logic/DaisyEntities.ts` | same | Converted Daisy domain/entity models. |
| `src/converted_app/logic/DaisyGeminiService.ts` | same | Converted AI-provider service; provider dependency must be checked against the Daisy-only OS requirement. |
| `src/converted_app/logic/DaisyRepository.ts` | same | Converted data repository layer. |
| `src/converted_app/logic/DaisyViewModel.ts` | same | Converted UI view-model layer. |
| `app/src/main/java/com/example/data/DaisyEntities.kt` | same | Android data/domain entities. |
| `app/src/main/java/com/example/data/DaisyGeminiService.kt` | same | Android provider service; conflicts with “Daisy only / Gemini removed” note unless intentionally retained for a separate app. |
| `app/src/main/java/com/example/data/DaisyRepository.kt` | same | Android data repository. |
| `app/src/main/java/com/example/data/model/AgenticMesh.kt` | same | Android agent-mesh model. |
| `app/src/main/java/com/example/ui/DaisyCoreConsole.kt` | same | Android Daisy core console UI. |
| `app/src/main/java/com/example/ui/DaisyViewModel.kt` | same | Android Daisy console view-model. |

## Related Daisy source — SOLVEX-PARADOX-BOX

| Path | Origin | Purpose |
|---|---|---|
| `src/brain/DaisyBrain.ts` | `iamfather420-ctrl/SOLVEX-PARADOX-BOX` | Separate repository version of the Daisy brain; reconcile against Full-Build before choosing a canonical copy. |
| `src/qa_v4/src/daisycore/daisyBrain.ts` | same | QA-v4 Daisy brain implementation. |
| `src/qa_v4/daisyIntegration.ts` | same | QA-v4 integration entry for Daisy components. |
| `src/marketplace/OrderLifecycle.ts` | same | Marketplace order lifecycle state machine; separate from `src/lib/lifecycle.ts`. |
| `src/database/SqliteStore.ts` | same | SQLite persistence layer; check whether it is wired into the canonical Daisy runtime. |
| `src/proofs/daisy_architecture.ts` | same | Architecture/proof model for Daisy system claims. |
| `src/tests/enterpriseVerification.ts` | same | Enterprise invariant suite, including system/lifecycle checks. |
| `src/tests/dfrlVerification.ts` | same | DFRL proof verification tests. |
| `src/tests/dfrlApiVerification.ts` | same | DFRL API verification tests. |
| `app/src/main/assets/app.js` | same | Android WebView app JavaScript bundle. |
| `app/src/main/assets/index.html` | same | Android WebView app shell. |
| `app/src/main/assets/style.css` | same | Android WebView styling. |
| `app/src/main/AndroidManifest.xml` | same | Android application manifest and declared capabilities. |

## Missing or unverified components

1. **Lifecycle transition completeness:** the source declares cancellation, needs-review, and recovery transitions without public methods to drive all of them. The new verifier documents exact uncovered edges; implement explicit, permission-checked transition APIs and tests before claiming full state coverage.
2. **Durable governance history:** `Lifecycle` keeps tasks/audit entries in memory. The shown digest is not cryptographic. A production governance ledger needs durable storage, cryptographic hashing/signing, replay protection, and tamper/recovery tests.
3. **Daisy canonical-source manifest:** there are multiple Daisy implementations in Full-Build, SOLVEX-PARADOX-BOX, converted_app, Android app, and artifact app. A source-of-truth/provenance map with hashes and version relationships is still needed; do not treat similarly named files as interchangeable.
4. **Provider alignment:** `DAISY_AI_OS.md` says “Gemini removed. Daisy only,” while Android/converted modules include `DaisyGeminiService`. Determine whether these are legacy/separate deliverables or remove/replace only with an approved source-based change.
5. **Native build artifacts:** `daisy-ai-os/BUILD.txt` references `machine-os/boot/daisy-kernel.elf` and `native/kernel/`; presence and reproducible generation must be confirmed in a clean build before claiming a working native OS. A note alone is not proof that the binary is checked in or runnable.
6. **End-to-end runtime wiring:** UI, brain, provisioning, autonomous engine, self-updater, and persistence modules exist by path, but their complete safe integration and production behavior are not proven by the inventory.
7. **Production identity, permissions, and persistence:** trusted OIDC, least-privilege runtime database credentials, tenant isolation, backup/restore rehearsal, and fresh production gate evidence remain external readiness blockers from the current project status.
8. **Archives and other GitHub account:** this inventory records the two accessible repositories above. It does not claim exhaustive coverage of all prior archives, Google Drive uploads, Replit workspaces, or the separate `Solvex-Paradox-Box` GitHub account's repositories. Those sources must be enumerated and compared before declaring the Daisy source inventory globally complete.

## Reproduction

Run `npm run verify:lifecycle` from the Full-Build root. CI output reports covered states/edges and all currently unexercised transitions. Existing test/build workflows remain in place.
