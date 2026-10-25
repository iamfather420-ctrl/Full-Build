# Cross-Repository Reconciliation — 2026-10-25

## Scope
First-pass inventory of SOLVEX + Daisy Haminja repositories. Source presence is not proof of runtime integration. No production database, authentication, or payment configuration was changed.

## Inventory
| Repository | Branch | Tracked entries | Initial disposition |
|---|---|---:|---|
| iamfather420-ctrl/Full-Build | main | 1,293 | Primary formal-verification/runtime source |
| iamfather420-ctrl/Uarefake-1 | main | 8,920 | Canonical app; includes imported source snapshots |
| iamfather420-ctrl/SOLVEX-PARADOX-BOX | main | 151 | Related proof, brain, API, and persistence source |
| iamfather420-ctrl/solvex-react-build | main | 549 | Separate React/Android source |
| iamfather420-ctrl/SolveXRepoUnify | master | 40 | Separate AI Studio app; compatibility not assumed |
| iamfather420-ctrl/Solvex-Hub | main | 84 | Separate Android/service source |
| iamfather420-ctrl/proof-before-power | main | 18 | Standalone Daisy/proof tests |
| iamfather420-ctrl/SolveX-Crystal-Clear-Box-Compliance-Immutibility | main | 26 | Compliance/immutability source |
| iamfather420-ctrl/agate-core-build | main | 36,408 | Large tree includes caches/toolchain material |
| iamfather420-ctrl/agate-unified-monorepo | master | 36,766 | Workspace repo with embedded project copies/caches |
| iamfather420-ctrl/agate-master-build | master | 36,766 | Likely overlaps unified monorepo; verify identity before merging |
| iamfather420-ctrl/FREEDOM-SIM-AI-OS | main | 41 | Separate OS/UI project |

Tree counts are GitHub tracked entries returned during inspection, not counts of unique useful modules.

## Consolidation already present
Uarefake-1 contains `integrated-sources/Full-Build/`, `integrated-sources/Daisy-Haminja-App-Forge/`, `integrated-sources/Daisy-Registry-Problem-Solving-Engine/`, and `integrations/source-repos/`. Its integration documentation explicitly says these are isolated source snapshots and not all wired into the root runtime.

## Runtime blockers verified
- `daisy-ai-os/server.mjs` imports `src/native-os/UnifiedDaisyAIOS.ts`, but the file is absent from the inspected Full-Build tree.
- `DaisyRuntime.boot()` sets an in-memory state to ACTIVE without validating activation evidence or production dependencies.
- `PermissionKernel.request()` grants based on literal subject names rather than verified identity and operation-bound authorization.
- `SystemTools.invoke()` returns hard-coded success-shaped paths, process status, memory counts, audit counts, and a claim that 54 nodes are alive.
- The root Full-Build API router is intentionally read-only and reports authentication disabled, payments disabled, and readiness BLOCKED.

Do not connect these native scaffolds to production execution yet. Recover the authentic runtime or implement a reviewed composition, replace hard-coded responses with real scoped operations or BLOCKED/NOT_IMPLEMENTED, and add authorization, failure, replay, and independent-verification tests.

## CI findings
- Full-Build main at inspection: `033546150dedb2732af07e608941299178402a0e`.
- Uarefake-1 main at inspection: `16192442622c8bbd33f20cb8a46755b16b33028f`; Vercel status checks succeeded, but this does not prove the full native runtime works.
- Recent Full-Build runs on `ops/fullbuild-repo-status-20261023` failed at dependency installation: Bun 1.3.3 reported `Unknown lockfile version` for `bun.lock`; a Bun 1.4.4 run also reported that the frozen lockfile needed changes. Missing installed binaries then caused build/typecheck/formal steps to fail.
- Therefore, those runs do not provide a clean 120-case or 46-gate pass. First repair the authoritative lockfile, then rerun all checks from one commit.
- A Uarefake source-import run passed on one commit but another failed while pushing generated changes; repeatability remains to be confirmed.

## Next safe actions
1. Commit a valid lockfile for the chosen package manager and retain frozen/reproducible installation.
2. Run build, typecheck, release-safety, payments-disabled, formal 120-case, and 46-gate checks on the same commit; preserve logs and artifacts.
3. Run standalone suites in SOLVEX-PARADOX-BOX, proof-before-power, and relevant Daisy packages.
4. Compare Agate repository ancestry and file identity; exclude caches and generated output.
5. Wire modules only after interface, security, and end-to-end tests pass.

Keep payments disabled and do not enable production authentication or claim readiness before identity, tenant isolation, persistence, restore, and release gates pass.
