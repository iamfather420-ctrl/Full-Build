# 46-Gate / Protocol Audit Checklist

Use this to map every gate to current code, an automated test, and fresh evidence. Anything without current evidence stays **BLOCKED**.

## Authoritative pipeline (GATE-00 – GATE-14)
| Gate | Name | Current evidence status | Notes |
|:---|:---|:---|:---|
| GATE-00 | Repository integrity | Historical PASSED | Re-verify on current commit |
| GATE-01 | Dependency preflight | Historical PASSED | |
| GATE-02 | Secret & config preflight | Historical PASSED | |
| GATE-03 | Environment selection | Historical PASSED | |
| GATE-04 | Build & TypeScript | Historical PASSED | |
| GATE-05 | Unit & enterprise tests | Historical PASSED | See PR #16 |
| GATE-06 | DFRL 88 Z3 | Re-run 120/120 on real WASM | Root hash differs from historical baseline |
| GATE-07 | Cleanroom replay | Re-run matched | |
| GATE-08 | Mutation / tamper | Historical PASSED | |
| GATE-09 | Daisy 54-node | Historical PASSED | |
| GATE-10 | Multi-tenant persistence | Historical PASSED (local) | Neon path not proven |
| GATE-11 | External providers / database boundary | BLOCKED | Least-privilege runtime role and end-to-end Neon isolation remain unproven; PayPal is excluded from this release |
| GATE-12 | End-to-end lifecycle | Historical PASSED | |
| GATE-13 | Evidence packaging | Historical PASSED | |
| GATE-14 | Final production gate | BLOCKED | Missing external credentials & isolation proof |

## Remaining gates (15–46)
`System46Gates.evaluateAll46Gates()` produces the full inventory. Re-run `scripts/verify_120_z3_and_46_gates.ts` on the current commit and archive the resulting `system-46-gates.json`. Any gate that returns `EXTERNAL_PROVIDER_REQUIRED`, `BLOCKED`, or lacks a fresh artifact stays open.

## Evidence rule
- Historical JSON is not current evidence.
- A skipped or mocked check is not a pass.
- Production login stays disabled until GATE-14 is no longer blocked by missing isolation and role proof.
