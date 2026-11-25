# Daisy 22-file overlay reconciliation — 2026-11-25

## Scope and source identity

The complete user-supplied archive `daisy-ai-full-build-22-files.zip` was inspected. It contains 22 regular files (plus directory entries) and its `MANIFEST.txt` lists exactly those 22 paths.

- Archive SHA-256: `6dd2c174be18afce964803777ba73ca2b4ba37c815ad866aa3ada0c7c4a4c28b`
- Repository baseline: `main` at `36c8d42f3515d11ae8d70b1c8a97360d5d8d35ba`
- Integration branch: `integration/daisy-22-overlay-20261125`
- The archive is an application/code overlay, not the full repository and not a model-weight or training-corpus archive.

The earlier `22-file-integration-reconciliation.md` was written before the complete archive was available. This report supersedes its statement that the original file bodies were unavailable.

## Reconciliation rule

Do not extract the ZIP over the current checkout. Several incoming files overlap with newer, repository-specific implementations. The existing server/authentication boundary, inference runtime, discovery client, application shell, foundational instruction, package manager and CI pipeline are retained. Only the non-duplicative contract and the missing withheld-only review endpoint are integrated.

## Per-file disposition

| Incoming path | SHA-256 | Disposition |
|---|---|---|
| `server.ts` | `669378e26953010bb83142ac499bf6fa06e86fbd3118fdeec673f9b5137f74ba` | Retain current server bootstrap; it mounts the shared authenticated API router. |
| `src/App.tsx` | `2b9ffec2d58e33a80a17734310d1050192ab9737dfd762ce8be191464cc49c19` | Retain current application shell; no replacement UI or new navigation. |
| `src/api/DaisyAIRouter.ts` | `dea1e430e747c642af5c489473374c865091c4180928b459e5c146c7967dd8dc` | Do not copy as a parallel router. Its status/chat responsibilities already exist in `DaisyBackendRouter`; its discovery review behavior was adapted there behind the existing tenant-auth boundary. |
| `src/api/DaisyAIRuntimeContract.ts` | `de5691258adc92027997c32e0897b5ee14a33481576de545f9bfbe3521cfba24` | Retain as reference; current API response is validated by endpoint tests. No duplicate status schema introduced. |
| `src/components/DaisyAIConsole.tsx` | `aec86f83ca92005efc0465054206c54125c8febdcc27147e598e023a987f677d` | Preserve as source material; not mounted. Existing integration scope keeps the current SolveX UI unchanged. |
| `src/components/DaisyBrainView.tsx` | `fe26a9e7f35f7258bcc7cfb73cdc68d3135f46da344245fece29b382a02a65e4` | Retain current repository brain view; no duplicate component. |
| `src/discovery/DiscoverEngineClient.test.ts` | `397c82e56d98b0652d7580fb423fd3cacec960ee9e8ee4c2fda0a0e1a78491a5` | Retain current stricter withheld-only client tests, including malformed and publishable-response rejection. |
| `src/discovery/DiscoverEngineClient.ts` | `e4c557db5b32c39f7c737f958983aa72ae9260f432a3fc523ffec70f0da4dbdf` | Retain current hardened client: HTTPS/loopback policy, redirect rejection, bounded response, and withheld-only result validation. |
| `src/discovery/DiscoverEngineContract.ts` | `9b4fafba0280e75174854db644972611a569a79190a81f1b0b25e80574d40471` | Added strict Zod request contract; cross-checks claim/source identity, URL and title. |
| `src/inference/DaisySystemInstruction.ts` | `2a9913dd30721038733010ef80f94afdaa24ee0eff9dfb6acba4e41ab2acca25` | Do not add a parallel loader; existing backend loads and hashes the canonical tracked instruction. |
| `src/inference/LocalInferenceRuntime.ts` | `3ace6559f27571ddfeb8120fa9e82a241a5620eacaf3a771c44179935da02a0d` | Retain current repository runtime, which has additional bounded process/output handling and a restricted child environment. |
| `scripts/test_daisy_ai_api.ts` | `642ea4ce60cc93a92699f442c38882737d93ce6ab7feb5442b679834925ff1b5` | Adapted to the existing `DaisyBackendRouter`; tests tenant auth, blocked inference, input validation, withheld-only discovery and credential isolation. |
| `scripts/verify_daisy_foundational_safety.mjs` | `d1df0bf5be79727f350439c0b0a85ce930705b28e5c27b60a5372f58d9df3226` | Retain current repository safety verifier; the archive copy references a different `Solvex-core` layout and is not a safe replacement. |
| `.env.example` | `c776e73e56746c9bb125ff78bd07480bf2d81ba7808acd6536b95d955c0fb0ce` | Merged only the optional `DAISY_DISCOVER_ENGINE_URL` and `DAISY_DISCOVER_ENGINE_TOKEN` names; no credentials added. |
| `pnpm-workspace.yaml` | `65ab811280847c30c6cbca139ca116e36b3ec05d9fce80b2b48b95915b55c4c1` | Not added; current repository uses its existing Bun/workspaces setup. No second package-manager contract introduced. |
| `package.json` | `e5e342c9c9784138d0fc9f6b79a4a8e74dd62f95f49d35f8f8aafcdd20043866` | Retain current dependencies/scripts; add only `test:daisy-ai-api`. No wholesale manifest replacement. |
| `.github/workflows/ci.yml` | `d0042b3aa4f1665e78607584ce20b843e309c3c37f031d865ad8b8b15a32cfdf` | Retain current workflow permissions/jobs; add a dedicated Daisy API regression-test step. |
| `DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md` | `c13cc77a2f037f3c433597a9a5619c82ff804e03f892967453fb011ed21c3a7f` | Retain the repository's existing canonical instruction; do not replace it blindly with an overlay copy. |
| `MANIFEST.txt` | `0f4f4a1f0aacce67ec33d87a2d7849801d790f7d79707ecf514ace9d35068e69` | Used as the authoritative 22-path inventory; not copied into the application root. |
| `README_HANDOFF.md` | `a0c904599419660e6bd180f7c8298c37e565b6b5ff8851abe9e7c64b3765dab2` | Historical handoff only. Its blanket extract-and-replace instruction is superseded by this path-by-path reconciliation. |
| `docs/daisy/DAISY_AI_READINESS_2026-11-18.md` | `629ee53dbdd2eb80d63f36c3d5a2111ac8c0c4419e434da8e0a75a4f9a210f41` | Historical snapshot, not current verification evidence. Its test/deployment claims are not re-certified by this integration. |
| `docs/daisy/DAISY_AI_RUNTIME.md` | `c9e5928f816fa4a1c23174152574c3e96ec33496f99ae5e00f907b49b1d3da5b` | Historical design reference; current route and runtime behavior are defined by repository code and CI tests. |

## Implemented on this branch

1. Added `src/discovery/DiscoverEngineContract.ts` with strict source/claim schemas and cross-field consistency checks.
2. Extended the existing `src/api/DaisyBackendRouter.ts` with `POST /discovery/review`. It runs behind the existing shared OIDC/tenant authentication boundary, applies the existing per-tenant request limiter, validates and size-bounds the request, requires an operator-configured HTTPS Discover-Engine URL and server-side token, and returns only a withheld review. Missing configuration returns `BLOCKED` without making an outbound request.
3. Extended the status response to report instruction availability/hash and whether withheld-only review is configured. Status does not call Discover-Engine.
4. Added `scripts/test_daisy_ai_api.ts`, added `test:daisy-ai-api` to `package.json`, documented optional environment names, and added the test command to CI.

## Explicitly not done

- No production credentials or tokens were added.
- No external model API or discovery endpoint was called.
- No model weights were added, trained, activated, or deployed.
- No Daisy UI, server bootstrap, inference engine, foundational instruction, or package manager was replaced.
- No database schema or data was changed.
- The archive contains no model weights or conversational training corpus.

## Verification status

The integration branch is committed, but the repository CI run is the next verification gate. Until CI completes successfully, the code changes are **staged for review, not declared verified or production-ready**.
