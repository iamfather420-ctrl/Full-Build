# Gate inventory and evidence freshness

**Status:** Inventory documented. Fresh evidence against current `main` must be regenerated in CI; do not reuse stale reports as production proof.

## Formal corpus (120 cases)

| Layer | Count | Engine |
| --- | --- | --- |
| DFRL operators | 88 | Z3 WASM / native per workflow |
| DH contracts | 32 | Domain hash / registry |
| **Total** | **120** | Must match expected SAT/UNSAT + cleanroom replay |

Historical runs that labeled 68 models as “generated generalized” are **not** sufficient for production claims until theorem-specific models are verified on the release-candidate commit.

## Production / system gates (46)

From `System46Gates.ts`:

| Range | Category | Count |
| --- | --- | --- |
| 01–15 | Authoritative pipeline | 15 |
| 16–45 | Enterprise invariants | 30 |
| 46 | Master truth-boundary closure | 1 |

Any non-`PASSED` gate (including `BLOCKED` or `EXTERNAL_PROVIDER_REQUIRED`) prevents `VERIFIED_SOVEREIGN_CLOSURE`.

## Authoritative pipeline snapshot (stale example)

`execution-gates.md` records run `exec_pipeline_1792683102844` on commit `72862558…` (2026-10-22). GATE-14 was **BLOCKED**. That artifact is **not** evidence for current `main` (`11125c23…` as of 2026-10-27).

## Freshness rules

1. Evidence commit SHA must equal the release-candidate commit under review.
2. Regenerate via the repository’s authoritative verification workflow / `System46Gates.evaluateAll46Gates()`.
3. Retain hashed receipts; do not edit historical JSON to claim a new pass.
4. Formal corpus pass ≠ production activation. Keep those labels separate.
5. Missing, partial, or stale evidence ⇒ activation remains **BLOCKED**.

## Operator action

On a dependency-enabled runner after merging checklist PRs:

```bash
# Exact commands depend on package scripts / CI workflow names in-repo.
# Prefer the GitHub Actions “120-case” and “Build and Enterprise CI” workflows
# on the release-candidate SHA; download artifacts; attach to the release PR.
```

Until those artifacts exist for the candidate SHA, production readiness stays **NOT READY**.
