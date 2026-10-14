# Formal verification evidence status

## Historical 120-case record

The repository currently contains a historical 120-case report at `artifacts/formal-aggregation.json` and `artifacts/z3-120-formal-verification-summary.json`. Those files report 120 Z3 executions, 120 expected-result matches, 120 replay matches, 118 UNSAT results, 2 SAT results, and zero UNKNOWN/ERROR results. The recorded timestamp is **2026-10-01T19:43:23.542Z**, source commit `b992445d00e6f8e27bd0aeaf308ad2f17a64d142`.

Do not treat that as a fresh verification of today's source. The committed `artifacts/final-proof-gate.json` is from **2026-10-01T19:16:53.992Z** and names a different source commit, `728625581c2f89210c752d03fda0a154812b2366`. These artifacts are from different runs and are not one coherent, current-commit evidence package.

## Reproducible current-commit verification

The `Current 120-Case Formal Verification` GitHub Actions workflow runs:

1. `npm ci` from the lockfile.
2. The app build and TypeScript check.
3. `npm run verify:120` (88 DFRL operators + 32 DH formal contracts).
4. `node scripts/record_120_verification_run.mjs`, which requires all reports to match the exact checked-out commit, checks the execution/replay counts and shared root hash, and hashes the source artifacts.
5. Uploads `formal-aggregation.json`, `z3-120-formal-verification-summary.json`, `final-forensic-report.json`, and `current-120-verification-run.json` as a run-specific CI artifact.

To run locally from a clean checkout:

```sh
npm ci
npm run verify:120
node scripts/record_120_verification_run.mjs
```

The current-run manifest is deliberately marked **LOCAL/MODEL FORMAL VERIFICATION ONLY; NOT PRODUCTION CERTIFICATION**. A 120/120 SMT result does not establish live Neon connectivity, database tenant isolation, successful marketplace fulfillment, PayPal payment acceptance, or production deployment readiness.

## Production boundary

The historical full-build gate itself records production as blocked because live Neon provisioning and an explicit production runtime mandate were not satisfied. PayPal sandbox verification also recorded a credential failure. Those are separate gates and must not be silently promoted to PASS by the 120-case theorem-prover result.
