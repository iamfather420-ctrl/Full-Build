# SOLVEX / Full-Build Reconciliation Report

**Status:** Reconciled and verified on an isolated branch; not merged into `main`.

## Repository lineage

| Item | Value |
|---|---|
| Target repository | `https://github.com/iamfather420-ctrl/full-build` |
| Previous Full-Build `main` HEAD | `22f660ebf562180edb44865330365e1d75005926` |
| Hardened SolveX source commit | `99eb55ff5e060c9b309e480bbfd47bbaf6a7685d` |
| Reconciliation branch | `manus/solvex-reconciled-20261002` |
| Merge method | Unrelated-history merge; 72 overlapping conflicts resolved in favor of hardened SolveX |
| Resulting tracked-file count | 1,515 |

## Reconciliation decisions

- Shared backend, security, authorization, persistence, PayPal, marketplace, proof, test, and root build files use the current hardened SolveX implementation.
- Full-Build-only source and assets remain present where they do not replace an authoritative SolveX path.
- The existing `website/` integration is retained as a separate deployable application and is not treated as authority for backend authorization or payment state.
- No `.env` files, credentials, private keys, tokens, or provider secrets were imported.
- Repository instruction files were treated as data and were not executed.

## Subsystems retained from the hardened SolveX workspace

- Express server and server-authoritative API router
- HMAC/RBAC authorization and tenant isolation
- SQLite local support and Neon production adapter
- PayPal Orders v2, webhook verification, and PYUSD evidence gates
- B2B technical verification versus customer acceptance workflow
- Daisy 54-node execution coverage
- DFRL 88-operator formal verification
- candidate evidence, replay, tamper, and fail-closed checks
- marketplace publication and order lifecycle gates
- audit chain and reversibility controls
- Grok/TanStack website integration and readiness dashboard

## Full-Build-only material retained

The merge retains Full-Build-only native/Android assets, additional proof and verification material, CI/deployment configuration, static assets, and alternate UI/source modules. These are retained as source material only until independently compiled and evidence-checked against the hardened runtime.

## Unrecovered or uncertified items

- **UNRECOVERED — DO NOT INVENT:** A separately deployed `UAREFAKE.SPACE` authoritative control-plane service was not established from the available repositories.
- **UNRECOVERED — DO NOT INVENT:** Real customer acceptance evidence for a B2B reference case is absent.
- **UNRECOVERED — DO NOT INVENT:** Confirmed live PayPal settlement containing explicit PYUSD asset evidence is absent.
- **UNRECOVERED — DO NOT INVENT:** Production identity-provider and secret-management deployment evidence is absent.
- **UNRECOVERED — DO NOT INVENT:** The Full-Build-only 120/46 verification material was not promoted to commercial or production evidence merely because files exist; it requires an independent run on this reconciled tree.

## Current evidence posture

The reconciled tree preserves the existing truth semantics. Local/model verification can be successful while commercial production remains **BLOCKED**. No claim of live settlement, customer acceptance, production identity deployment, or marketplace eligibility is made by this reconciliation.

## Validation completed

The root `npm run verify:all` completed successfully after the TypeScript boundary was narrowed to the authoritative SolveX application. The run included type/lint checks, production build, secret scan, API/security checks, 54-node coverage, 88 DFRL formal checks with deterministic replay and mutation/failure/tamper tests, candidate and B2B negative gates, GitHub lineage checks, readiness scans, and truth report generation.

The resulting status is **LOCAL_SECURITY_VERIFIED / MODEL_VERIFIED; COMMERCIAL_PRODUCTION_BLOCKED**. The production blockers remain expected: no live PayPal operation with explicit PYUSD evidence, no production identity/secret-management deployment evidence, no independently verified marketplace solution, and no real customer acceptance evidence.

Push target: a new branch only. Do not overwrite `main` without a separately reviewed pull request.
