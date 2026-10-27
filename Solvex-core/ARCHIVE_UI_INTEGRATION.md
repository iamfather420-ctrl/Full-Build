# Archive UI integration (v0.1.0-daisy-ai-os)

## Provenance
- Combined archive SHA-256: `7072cd55a68ba9765102c233f0defd58709317e10a1bff6627767c8173b6178f`
- Source paths under `full-build-recovered/src/...`

## Diff summary vs fail-closed stubs
| Module | Change |
| --- | --- |
| `types.ts` | Merged App UI contracts with recovered GitHub/analysis types |
| `data.ts` | Recovered 54-node generator + sample paradox registry; **all payment providers inactive**; Stripe/demo active connections removed |
| `PaymentGateway.tsx` | Recovered layout; **removed** simulate-success / fabricate transaction; probe-only `/api/pay/create` |
| `CommandBar.tsx` | Recovered chat UI; **removed** buy/Stripe suggested commands |
| `ParadoxLedger.tsx` | Recovered; marked sample registry (not live proof ledger) |
| `JitFactory.tsx` | Recovered; deploy strings no longer claim live Cloud Run |

## Still not production-ready
- Paradox registry in `data.ts` is a small sample set, not the formal 88-operator corpus
- JitFactory compile UI remains a local demonstration of steps, not a verified release pipeline
- Payments remain server-disabled (410)
- No model weights in archive for first-party chat
