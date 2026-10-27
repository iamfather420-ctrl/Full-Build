# Native UI build closure (2026-10-27)

## Problem
`Solvex-core/src/App_native.tsx` imported modules that were absent from the tree:

- `./data`, `./types`
- `./components/PaymentGateway`, `ParadoxLedger`, `JitFactory`, `CommandBar`
- `./components/NodeGrid`, `GithubUnifier` (only `*_native` variants existed)
- `src/main.tsx` (required by `index_native.html`)

No recoverable original source for those components was found in public history or other `iamfather420-ctrl` repositories. Preferred recovery remains the multi-part Daisy ISO / Smash archives.

## What this branch does
Adds **fail-closed stubs** so the native Vite entry can resolve and the UI can render without claiming operational payments, JIT builds, or live formal ledger results.

| Module | Behavior |
| --- | --- |
| `types.ts` | Contracts mirrored from `types_native.ts` |
| `data.ts` | 54 illustrative nodes + inactive payment providers |
| `PaymentGateway` | Explicit BLOCKED; toggles only re-assert disabled state |
| `ParadoxLedger` | Informational placeholder; points at root `verify:120` |
| `JitFactory` | Explicit BLOCKED; no compile/publish path |
| `CommandBar` | Real chat UI wired to `/api/chat` (already returns BLOCKED without inference) |
| `NodeGrid` / `GithubUnifier` | Re-export existing `*_native` implementations |
| `main.tsx` | React entry for `index_native.html` |

## What this does **not** do
- Does not enable PayPal or any payment provider
- Does not connect first-party inference
- Does not invent SAT/UNSAT evidence
- Does not replace the preferred archive recovery of original UI modules
- Does not change production deployment or Neon schema

## Follow-up
1. When archive parts are available, replace stubs with reviewed original modules after safety audit (no simulated payments / hardcoded success).
2. Wire ParadoxLedger to the authoritative formal registry once activation evidence is current.
3. Keep native `package_native.json` / Vite config aligned with root dependency policy.
