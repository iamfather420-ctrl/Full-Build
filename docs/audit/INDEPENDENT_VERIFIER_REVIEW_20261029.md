# Independent verifier review — 2026-10-29

**Branch:** `feat/canonical-registry-daisy-haminja-20261028`  
**PR:** #55 (unmerged)  
**Scope:** DFRL/DH expected vs observed, replay integrity, artifact names, 46-gate inventory

## Expected results are contract-defined

In `src/proofs/DFRLFormalVerifier.ts`:

- `expected` is taken from `item.expected_solver_result` on the formal model (sat|unsat).
- `proved` is `solverResult === expected` — **not** “solver said unsat” and not copied from a prior pass log.
- Classical contradictions (e.g. `R = not R`) remain `expected_solver_result: 'unsat'`.
- Theorem-specific witnesses remain `expected_solver_result: 'sat'` with finite/existential scope.

GATE-06 uses `isDfrl88GatePassed` (`src/proofs/dfrlGatePredicate.ts`), which requires `overall_status === 'VERIFIED'`, 88 executed, every `proved`, zero unknown/error — **not** `unsat_count === 88`.

## Replay does not copy expected into observed

`replayPropositionCleanroom`:

1. Builds a **new** Z3 context/solver.
2. Loads the **same SMT assertion string** via `fromString`.
3. Records `replay_result` from that independent `check()`.
4. Sets `replay_match` only when `replay_result === originalResult.solver_result` and assertion hashes align.

Expected contract fields are not written into the observed solver fields.

## Artifact name contract (closure)

`scripts/ci_proof_closure_check.ts` and `scripts/full_build_verification_closure.ts` require:

| Artifact | Producer |
| --- | --- |
| `formal-aggregation.json` | `verify_120_aggregation.ts` |
| `z3-120-formal-verification-summary.json` | `verify_120_aggregation.ts` |
| `daisy-brain-activation-gate.json` | `verify_120_aggregation.ts` |
| `system-46-gates.json` | `System46Gates` via verify_120 |
| `execution-gates.json` | `verify:authoritative` / pipeline (not fabricated by aggregation) |

Aggregation writes the first four; warns if `execution-gates.json` is missing rather than inventing it.

## 46-gate inventory

Composition: **15** authoritative (GATE-00..GATE-14) + **30** enterprise (INV-01..INV-30) + **GATE-46** master = **46**.

Fix: pipeline status `CONFIGURED` was previously mapped to `FAIL` in `System46Gates`, which incorrectly forced GATE-46 to FAIL when a provider was only partially configured. `CONFIGURED` now maps to `EXTERNAL_PROVIDER_REQUIRED`. Inventory length/uniqueness is asserted before return (no synthetic padding).

## Model registry

`models/registry.json`: Daisy Haminja slot **SLOT_EMPTY**. No GGUF on disk. Inference remains blocked until a real weight + runner exist.

## PR #55

**Do not merge** until CI on the head SHA regenerates the five artifacts above and `ci_proof_closure_check` passes against that exact commit.
