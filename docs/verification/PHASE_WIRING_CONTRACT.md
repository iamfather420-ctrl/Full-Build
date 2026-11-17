# SolveX pre-/post-production phase wiring

Status: **wiring contract drafted; runtime integration and full gate mapping remain pending validation**.

This document defines how pre-production evidence is handed to post-production checks without changing gate identities, weakening fail-closed behavior, or treating an unrun test as a failure.

## Phase sequence

1. **Pre-production:** run the checks that can be proven locally or in an isolated sandbox. The requested planning baseline is checks 1–44. The Daisy 54-node architecture must be present and locally/sandbox verified here; production credentials and live-provider calls are not prerequisites for proving the local node registry and safe execution paths.
2. **Production readiness / authorization:** the requested readiness checkpoint is evaluated only after pre-production prerequisites pass. It authorizes the production connection; it does not claim that live integrations have passed.
3. **Post-production:** run checks that require the connected production-like environment: provider authentication/connectivity, real persistence and tenant isolation, lifecycle execution, deployment health, telemetry, backup/restore, rollback, recovery, and operational monitoring.
4. **Whole-product verification:** after post-production checks, exercise the integrated SolveX product end-to-end, including Daisy's 54-node graph, node-to-node handoffs, software pipeline orchestration, JIT build/package/distribution flows, authorization boundaries, evidence lineage, and failure/recovery paths.
5. **Final consolidated verification:** combine the valid pre-production evidence, post-production evidence, and whole-product results into one report. Preserve every original gate ID. A test not yet eligible to run is `PENDING` / `NOT_APPLICABLE_YET`, never `PASSED` or `FAILED`.

## Shared evidence hand-off contract

Every phase result should carry:

- `gate_id`: immutable existing gate identifier.
- `phase`: `PRE_PRODUCTION`, `PRODUCTION_READINESS`, `POST_PRODUCTION`, `WHOLE_PRODUCT`, or `FINAL_CLOSURE`.
- `status`: `PASSED`, `FAILED`, `BLOCKED`, `PENDING`, or `EXTERNAL_PROVIDER_REQUIRED`.
- `claim_scope`: `LOCAL`, `MODEL`, `SANDBOX`, or `PRODUCTION`.
- `execution_id`, `commit_sha`, `environment`, `timestamp`.
- `evidence_ref` and `evidence_hash`.
- `depends_on`: prerequisite gate IDs and/or node IDs.
- `blockers`: machine-readable reasons; never secrets or credential values.

A downstream phase may consume an upstream result only when the commit and artifact provenance match, the evidence hash verifies, the result is in an allowed status, and all declared prerequisites are satisfied. Production evidence must not be inferred from local or model evidence.

## Known wiring points found in the current source

| Existing source | Current responsibility | Phase hand-off |
|---|---|---|
| `src/tests/authoritativeVerificationPipeline.ts` | GATE-00 through GATE-14 execution and artifact generation | Source of local/model/sandbox/provider results; extend only after tests establish compatibility |
| `src/tests/daisy54NodeCoverage.ts` and `src/nodes/NodeRegistry.ts` | Daisy 54-node registry and execution coverage | Pre-production node inventory/coverage; retain provider-specific checks as external dependencies |
| `src/proofs/System46Gates.ts` | Aggregates 15 authoritative gates, 30 enterprise invariants, and gate 46 closure | Existing aggregate evaluator; must not be silently renumbered |
| `src/database/NeonPersistence.ts` | Neon adapter / persistence checks | Post-production provider and persistence evidence |
| `src/payments/PayPalAdapter.ts` | PayPal adapter, currently intentionally disabled in canonical status notes | Keep disabled unless separately authorized; never make PayPal activation an implicit requirement for unrelated pre-production checks |
| `src/marketplace/OrderLifecycle.ts` | Order lifecycle | End-to-end/post-production lifecycle verification, subject to auth/provider prerequisites |

## Critical numbering reconciliation

The current `System46Gates` implementation does **not** represent a simple 1–44 / 45 / 46 phase split. It constructs 15 authoritative pipeline gates, 30 enterprise invariant gates (numbered 16–45), and one master closure gate (46). The authoritative pipeline itself currently records GATE-00 through GATE-14. Therefore, the requested planning labels (checks 1–44, readiness checkpoint 45, final closure 46) must be represented as a **phase overlay**, not applied by changing existing IDs or moving tests until a reviewed crosswalk exists.

Known authoritative pipeline entries include GATE-09 (Daisy 54-node coverage), GATE-11 (external providers), GATE-12 (end-to-end lifecycle), GATE-13 (evidence packaging), and GATE-14 (truth-boundary / production gate). These IDs and their current semantics must be preserved pending a formal crosswalk. In particular, do not claim that the existing enterprise invariant INV-30 is already the user's intended production-readiness gate merely because the aggregate currently assigns it numeric position 45.

## Fail-closed rules

- A pre-production pass proves only the declared local/model/sandbox claim scope.
- Provider-dependent checks may remain `EXTERNAL_PROVIDER_REQUIRED` before production connection; they do not become passes.
- Production readiness must require its declared pre-production dependencies, not post-production results that cannot exist yet.
- Post-production checks require a verified production-like target and must not run against an unintended live target.
- Whole-product pass requires all required node and pipeline hand-offs to be exercised, not merely a registry count or individual node pass.
- Final closure requires complete, provenance-matched evidence for all required checks. Missing evidence remains pending/blocked; no synthetic evidence or status promotion.
- Keep payments disabled and preserve current authorization boundaries unless a separate, explicit reviewed change authorizes otherwise.

## Implementation order

1. Freeze the current gate IDs and capture the baseline report.
2. Approve a crosswalk from user-facing phase/check numbers to existing gate IDs.
3. Add the shared typed phase/evidence contract and validators.
4. Add tests for provenance matching, status propagation, dependency ordering, and fail-closed behavior.
5. Wire pre-production artifacts into post-production prerequisites.
6. Add whole-product pipeline tests and final consolidated reporting.
7. Run dependency-backed CI and review the generated evidence before merging or deploying.

No live provider, database, payment, or deployment operation is authorized by this document.
