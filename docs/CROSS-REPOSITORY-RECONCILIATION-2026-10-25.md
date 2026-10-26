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
- Previous Full-Build runs on `ops/fullbuild-repo-status-20261023` failed at dependency installation: Bun 1.3.3 reported `Unknown lockfile version` for `bun.lock`; a Bun 1.4.4 run reported that the frozen lockfile needed changes.
- Diagnostic pull request #32 (`f0796d0c198159adb61a4a1ac908807771651481`) used `npm install --legacy-peer-deps` to expose source/test behavior without treating the stale lockfile as reproducible. On this commit, Build and Enterprise CI passed, formal-evidence hash stability passed, and Authoritative 120-Case Verification passed.
- The 120-case run reported 88/88 DFRL executions/replays, 32/32 DH executions/expected matches/replays, 120/120 expected-result matches and cleanroom replays, 118 UNSAT, 2 SAT, and 0 errors. The final check reported that the 46-gate inventory was internally consistent; it explicitly kept production activation blocked. This is a formal-corpus pass, not a pass of all production gates.
- The lockfile remains unresolved: the diagnostic install is not a substitute for a committed, frozen, reproducible dependency lock. Do not merge the diagnostic install change as the final CI fix.
- A Uarefake source-import run passed on one commit but another failed while pushing generated changes; repeatability remains to be confirmed.

## Next safe actions
1. Commit a valid lockfile for the chosen package manager and retain frozen/reproducible installation.
2. Run build, typecheck, release-safety, payments-disabled, formal 120-case, and 46-gate checks on the same commit; preserve logs and artifacts.
3. Run standalone suites in SOLVEX-PARADOX-BOX, proof-before-power, and relevant Daisy packages.
4. Compare Agate repository ancestry and file identity; exclude caches and generated output.
5. Wire modules only after interface, security, and end-to-end tests pass.

Keep payments disabled and do not enable production authentication or claim readiness before identity, tenant isolation, persistence, restore, and release gates pass.


## Expanded large-repository overlap scan

Repository metadata and representative manifests/source files were inspected across the accessible account inventory. GitHub repository “size” is storage metadata, not a measure of useful source. In particular, the very large Agate repositories contain embedded workspaces, caches, and toolchain material, so their raw tracked-entry counts are not evidence of unique functionality.

| Repository | Approx. GitHub size (KB) | Overlap / code review result | Import decision |
|---|---:|---|---|
| `agate-master-build` | 172,540 | Workspace shell with `apps/*` and `packages/*`; inspected `apps` subtree SHA matched `agate-unified-monorepo` in the earlier tree comparison. | Do not merge as another full copy. |
| `agate-unified-monorepo` | 172,571 | Same workspace structure and matching inspected `apps` subtree as `agate-master-build`; large count includes embedded project copies/caches. | Treat as overlapping duplicate until a package-level diff proves otherwise. |
| `agate-core-build` | 172,156 | React/Android application scaffold overlaps `solvex-react-build` and parts of Full-Build; package manifest uses older Vite/TypeScript generations and does not declare the current Z3 dependency. A direct lookup for the missing native runtime class returned not found. | No blind merge; no missing runtime recovered. |
| `Uarefake-1` | 115,452 | Canonical app; includes isolated imported snapshots and has the app-specific governance lifecycle/tests. Its docs explicitly say imported code is not all wired into the live runtime. | Keep as canonical app; do not re-import its own snapshots. |
| `solvex-react-build` | 22,267 | React/Android sibling overlaps the older Agate application scaffold; package manifest differs from Full-Build and does not establish formal-runtime compatibility. | No full-tree merge. |
| `Full-Build` | 22,052 | Primary formal-verification source: Z3/DFRL/DH corpus, 46-gate inventory, enterprise verification, API and native runtime scaffolding. | Keep as core verification source. |
| `SolveX` | 8,413 | Separate AI Studio / Android project; README requires a Gemini API key and Android Studio. Not the same runtime or backend. | Keep as a separate UI/app source unless an Android-specific release is explicitly being assembled. |
| `web-build` | 7,603 | Uarefake-style app fork with an embedded alternate Full-Build verifier. Its `verify_120_corpus.ts` hard-codes several mutation/failure/tamper flags to `true`, and its companion report says 3 SAT cases, conflicting with the current authoritative corpus's 2 SAT cases. | Reject as a source of authoritative verification code. |
| `SOLVEX-PARADOX-BOX` | 3,025 | Contains DFRL/Z3 proof engine, MMTAI, NOPOT, Crystal Clear Box, and enterprise test paths that overlap with matching modules already in Full-Build. Some tests assert API status strings and “zero mock” flags; those labels alone do not independently establish the behavior. | Do not duplicate overlapping modules or promote its test results as independent evidence. |
| `bloom-clear-tiger-meadow` | 3,064 | Package manifest substantially matches the Uarefake app family (TanStack Start, Better Auth, PGlite/pg, Vite 8, similar scripts). It is a fork/sibling rather than a missing core module. | No full-tree merge; review only genuinely unique commits if identified. |
| `SolveXRepoUnify` | 1,038 | React/Vite app fork with a different dependency set. Related self-updater/admin-injector files also appear in `Autonomous-consolidated-B2B-solutions`, so they are duplicated. | Do not import self-mutating runtime injector code without a separate threat model and constrained patch pipeline. |
| `FREEDOM-SIM-AI-OS`, `Solvex-Hub`, `proof-before-power` | smaller | Separate AI Studio / Android / proof-demo projects. The proof-before-power manifest contains no executable test/build scripts; README is AI Studio boilerplate. | No verified, complete, needed module established in this pass. |

## Candidate-module completeness review

### Already present / overlapping — no import needed
- Full-Build already contains `src/mmtai/MMTAIProtocol.ts`, `src/proofs/NOPOTProof.ts`, `src/audit/CrystalClearBox.ts`, `src/database/ReversibilityEngine.ts`, `src/tests/enterpriseVerification.ts`, and the Z3 formal proof engine. The corresponding SOLVEX-PARADOX-BOX imports/tests substantially duplicate these components.
- Uarefake-1 already contains the full Full-Build source snapshot under `integrated-sources/Full-Build/` and a filtered source snapshot under `integrations/source-repos/`. These are provenance-preserving copies, not runtime connections.
- Uarefake-1 already has `src/lib/solvex-governance-lifecycle.ts` plus its test. It is an app-level policy validator; its own reconciliation notes correctly state that this does not yet supply atomic durable transitions or a verified HMAC audit chain. Moving it into the formal core would create a framework/dependency mismatch rather than complete the runtime.

### Reviewed but rejected — not complete or not safe to import
- The alternate `web-build` formal runner reports a different SAT distribution from the current canonical corpus and marks mutation/failure/tamper tests as passed with literal booleans. It is not authoritative verification evidence.
- Daisy self-updater/admin-injector/provisioner modules are duplicated across related app repositories and describe runtime code mutation, injection, or automatic provisioning. They are not a missing, verified native runtime and should not be merged into the privileged execution path.
- The required `daisy-ai-os/src/native-os/UnifiedDaisyAIOS.ts` was checked at its expected path in Full-Build and at corresponding paths in the large Agate/React sibling repositories; it was not found. Do not synthesize a class just to satisfy the import.
- The Solvex-Paradox-Box enclave/API tests are coupled to its own `ParadoxOperator`, API/router and registry implementation. Their current assertions are not drop-in tests for Full-Build's interfaces and some use status flags as evidence. Importing them without adapting them to test the real target would create false confidence.

## Import outcome

**No new source module was imported in this pass.** That is a deliberate evidence-based outcome: each candidate identified so far is either already present, a near-duplicate/fork, app-specific and dependency-incompatible, stale against the authoritative SAT corpus, or unsafe/incomplete for privileged execution. Importing any of these would increase file count without closing a verified capability gap.

The remaining meaningful gap is not a missing pile of source files: it is the authentic, secure native Daisy runtime composition and its real system-tool/authorization implementations. The next implementation must be tested against the target's real interfaces, return BLOCKED/NOT_IMPLEMENTED for unsupported tools, and preserve human authorization, independent completion verification, and fail-closed behavior.
