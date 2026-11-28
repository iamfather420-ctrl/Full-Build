# Full-Build readiness subsystem

This module is the production-readiness and Daisy completion control surface for SolveX Full-Build. It does not replace the weight engine, inference router, discovery client, Neon gate, or auth boundary.

## What a pass means

A check passes only when the test named on its evidence row was executed and the actual result matched the expected result. A file path, class name, or configured environment variable is not a pass.

Blocked and unverified checks stay in the score denominator. Not-applicable checks are omitted. There is no path that turns the transitional GGUF into a proprietary Daisy model by renaming it.

## Daisy

The language-source manifest still does not authorize training. A later review hashed 79 acquired files and admitted none. The required manifest change is a proposal in `artifacts/proposed-manifest-change-2026-11-27.json` and has not been applied. Discover-Engine under `Solvex-Paradox-Box` returned HTTP 404; the public `iamfather420-ctrl/Discover-Engine` repository does not read this collection.

The chat runtime in `src/inference` still identifies the transitional GGUF recorded in `verifiedDaisyModel.ts`. `replace-temporary` refuses to remove it. `FirstPartyInferenceRuntime` is left unchanged.

## Authorization

`GET /api/readiness/scan` reads public GitHub metadata. `POST /api/readiness/execute` is mounted after Full-Build's existing auth boundary. The body must include `approve: true` before any training starts. Database migrations, deploys, secret rotation, and branch pushes are refused. `SOLVEX_ALLOW_GIT_EXEC` is not enabled by this change.

The draft audit table lives at `src/readiness/schema/006_readiness_audit.draft.sql`. It is outside `migrations/` so existing runners cannot apply it automatically.

## Tests

`npm run test:readiness`

The tests call the existing weight-engine SGD implementation. They do not stub loss, accuracy, or GitHub status.
