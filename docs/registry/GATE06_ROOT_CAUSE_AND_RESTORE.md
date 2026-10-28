# GATE-06 root cause and restore

## Root cause (confirmed)

`src/tests/authoritativeVerificationPipeline.ts` GATE-06 used:

```ts
const dfrlOk = dfrlReport.unsat_count === 88 && dfrlReport.overall_status === 'VERIFIED';
```

After theorem-specific DFRL models, many operators **expect sat**.  
`DFRLFormalVerifier` / `verify_120` treat `proved` as matching `expected_solver_result`.

So aggregation can report **120/120 expected matches** while GATE-06 still requires **88 unsat** → **FAIL**.

Shared fix: `src/proofs/dfrlGatePredicate.ts` → `isDfrl88GatePassed(report)`.

## Emergency restore

If `authoritativeVerificationPipeline.ts` was corrupted to a placeholder/stub, restore from:

```bash
git checkout 95c6d0dd16e09afffd88cc0761cd7a4b06eaeac0 -- src/tests/authoritativeVerificationPipeline.ts
```

Then apply:

1. Add import: `import { isDfrl88GatePassed, dfrl88GateDetails } from '../proofs/dfrlGatePredicate';`
2. Replace GATE-06 predicate with: `const dfrlOk = isDfrl88GatePassed(dfrlReport);`
3. Prefer details: `dfrl88GateDetails(dfrlReport)`

Fixed local copy for operators: regenerate from that commit + those three edits.

## GATE-11 / 12 / 14 / 46

| Gate | Expected status without providers |
| --- | --- |
| GATE-11 | EXTERNAL_PROVIDER_REQUIRED (Neon/PayPal) — **correct fail-closed** |
| GATE-12 | BLOCKED if lifecycle needs escrow/pay — **do not fake** |
| GATE-14 | BLOCKED until production evidence |
| GATE-46 | FAIL/BLOCKED while any prior non-PASS remains |

Do not mark GATE-11/12/14 PASSED without real credentials and tests.

## Native Oct 10 SAT artifact

Hashes mismatch current formal sources; historical only. Not GATE-06 pass evidence for this branch.
