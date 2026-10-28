# verify_120 DFRL criteria update

`DFRLFormalVerifier` now sets `proved` when observed result matches `expected_solver_result`.

Update `scripts/verify_120_aggregation.ts` on merge so `dfrlCasesValid` is **not** all-unsat-only:

```ts
const dfrlCasesValid = dfrlReport.results.length === 88 && new Set(dfrlIds).size === 88 &&
  dfrlReport.results.every(r => r.proved && (r.solver_result === 'unsat' || r.solver_result === 'sat')) &&
  dfrlReport.replays.length === 88 &&
  dfrlReport.replays.every(r => r.replay_match &&
    (r.original_result === 'unsat' || r.original_result === 'sat') &&
    r.replay_result === r.original_result &&
    r.original_assertion_hash === r.replay_assertion_hash);

const dfrlExpectedMatches = dfrlReport.results.filter(r =>
  r.proved && (r.solver_result === 'unsat' || r.solver_result === 'sat') && r.claim_scope === 'MODEL_VERIFIED'
).length;
```

Local copy with this patch: apply before claiming 120 green on the theorem-specific registry.
