# Daisy 22-file integration reconciliation

Date: 2026-11-18
Base: `main`
Status: partial reconciliation; no wholesale import or merge performed.

## Scope and evidence

The supplied 22-path inventory was recovered from the conversation. The original complete file bodies were not available in the recovered export: its contents were truncated at `package.json`. Therefore this document maps the inventory to the current repository by path and observed architecture, but does not claim source-to-source compatibility for files whose incoming contents could not be inspected.

## Inventory against the inspected main snapshot

### Already present (11)

- `.env.example`
- `.github/workflows/ci.yml`
- `package.json`
- `scripts/verify_daisy_foundational_safety.mjs`
- `server.ts`
- `src/App.tsx`
- `src/components/DaisyBrainView.tsx`
- `src/discovery/DiscoverEngineClient.test.ts`
- `src/discovery/DiscoverEngineClient.ts`
- `src/inference/LocalInferenceRuntime.ts`
- `DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md`

These are existing integration points, not candidates for blind replacement. In particular, `server.ts` mounts `src/server/apiRouter.ts`; that router already applies the shared OIDC/auth boundary before its route handlers. A second Daisy router must be mounted behind that same boundary, not replace the server or bypass auth.

### Not present in the inspected main snapshot (11)

- `pnpm-workspace.yaml`
- `scripts/test_daisy_ai_api.ts`
- `src/api/DaisyAIRouter.ts`
- `src/api/DaisyAIRuntimeContract.ts`
- `src/components/DaisyAIConsole.tsx`
- `src/discovery/DiscoverEngineContract.ts`
- `src/inference/DaisySystemInstruction.ts`
- `MANIFEST.txt`
- `README_HANDOFF.md`
- `docs/daisy/DAISY_AI_READINESS_2026-11-18.md`
- `docs/daisy/DAISY_AI_RUNTIME.md`

Absence from this snapshot does not prove these files are unnecessary. Their actual contents and import graph must be inspected before adding them.

## Where each incoming file belongs

| Incoming path | Intended responsibility | Integration decision |
|---|---|---|
| `.env.example` | Environment-variable names and safe placeholders | Existing file: reconcile variable-by-variable; never overwrite deployed secrets/configuration |
| `.github/workflows/ci.yml` | CI checks | Existing workflow: merge required jobs/steps after comparing triggers, permissions, and concurrency |
| `package.json` | Scripts, dependencies, workspace metadata | Existing manifest: merge dependencies/scripts carefully; preserve current workspace and lockfile consistency |
| `pnpm-workspace.yaml` | pnpm workspace package discovery | Missing: add only if the submitted package manager/workspace layout requires it; coordinate with lockfile |
| `scripts/test_daisy_ai_api.ts` | API integration tests | Missing: add after router and runtime contract are defined |
| `scripts/verify_daisy_foundational_safety.mjs` | Foundational safety static checks | Existing: compare test coverage and referenced paths; do not weaken checks |
| `server.ts` | HTTP server bootstrap | Existing: keep current server and shared auth boundary; mount Daisy routes through the existing API router |
| `src/App.tsx` | React application composition | Existing: integrate console through current navigation/state patterns |
| `src/api/DaisyAIRouter.ts` | Daisy HTTP endpoints | Missing: implement behind the shared authentication middleware; validate inputs and fail closed |
| `src/api/DaisyAIRuntimeContract.ts` | Request/response and runtime contracts | Missing: define typed schemas and explicit capability/authority/authorization boundaries |
| `src/components/DaisyAIConsole.tsx` | Daisy operator/user console | Missing: connect only to authenticated, implemented APIs; label unavailable capabilities accurately |
| `src/components/DaisyBrainView.tsx` | Existing brain topology/state view | Existing: retain as the brain visualization; reconcile props/state instead of duplicating it |
| `src/discovery/DiscoverEngineClient.test.ts` | Discovery client tests | Existing: extend with malformed-payload and publishable-response rejection cases |
| `src/discovery/DiscoverEngineClient.ts` | Discovery service client | Existing: runtime-validate remote responses and fail closed on malformed or publishable assertions |
| `src/discovery/DiscoverEngineContract.ts` | Discovery protocol contract | Missing: determine whether this is a shared schema or duplicate of existing client types before adding |
| `src/inference/DaisySystemInstruction.ts` | Daisy instruction source | Missing: compare against `DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md`; establish one canonical source or generated artifact |
| `src/inference/LocalInferenceRuntime.ts` | Local inference execution | Existing: adapt only after checking the submitted runtime contract; avoid parallel inference engines |
| `DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md` | Foundational policy/instruction document | Existing: preserve as canonical until a controlled migration is specified |
| `MANIFEST.txt` | Package/build manifest | Missing: establish whether it is a release manifest, file inventory, or runtime manifest before use |
| `README_HANDOFF.md` | Handoff and operational instructions | Missing: add after runtime wiring and verification steps are confirmed |
| `docs/daisy/DAISY_AI_READINESS_2026-11-18.md` | Readiness assessment | Missing: write only from reproducible test/deployment evidence; do not treat claims as verification |
| `docs/daisy/DAISY_AI_RUNTIME.md` | Runtime architecture and operations | Missing: document actual request path, auth, inference provider, persistence, and failure modes |

## Current architecture constraints

- `server.ts` mounts `src/server/apiRouter.ts`; the latter applies the shared OIDC/auth middleware. Daisy endpoints must be mounted within this authenticated routing boundary.
- The repository already has brain, node registry, orchestration, inference, discovery, learning/tether, and weight-engine subsystems. New files should adapt these rather than create parallel sources of truth.
- Daisy Tether is the connection system for 54 cognitive nodes. The 120 paradoxes are a separate corpus, not a 120-synapse topology.
- Capability, authority, authorization, and execution must remain distinct. External model/provider access must be explicit and opt-in; unverified claims remain withheld.
- The 45-gate verification inventory and its separate subsequent 46th gate must not be conflated with the 67 activation-gate checks.

## Changes made on this integration branch

1. `src/discovery/DiscoverEngineClient.ts`: removed the impossible `'VERIFIED' as never` comparison and added runtime validation for every required review field and allowed status. A malformed successful response now fails closed.
2. `src/discovery/DiscoverEngineClient.test.ts`: added tests that reject a publishable review and reject a malformed review payload.

## Not yet established

- The original complete source of all 22 submitted files was not available for exact diffing.
- No API router, UI console, runtime contract, workspace manifest, or handoff/readiness document has been imported from the truncated export.
- No production deployment, runtime integration, APK build, or full verification suite has been claimed or performed by this reconciliation.
- Existing CI notifications indicated failures on the repository's main/related branches; this branch still requires CI execution and review.

## Required next input for full source integration

Provide the complete original 22-file archive or all 22 complete file bodies. Then perform an exact source diff, resolve API and runtime contracts against the existing server/auth/inference architecture, add only non-duplicative files, and run the repository's relevant tests and verification gates before considering merge.
