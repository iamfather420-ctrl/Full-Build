# Canonical registry audit — 2026-10-28

**Baseline main:** `347174820bd49120427aaf91c1eb293410900d40`

## Contract counts (distinct concerns)

| Corpus | Required | Source on main / this branch |
| --- | ---: | --- |
| DFRL operators | 88 | `src/data/paradoxData.ts` + `src/paradoxes/TheoremSpecific68.ts` |
| DH formal contracts | 32 | `src/formal/dhAuthoritativeFormalContracts.ts` (unique DH-P-001..032) |
| **Total formal** | **120** | 88 + 32 |
| System gates | 46 | `src/proofs/System46Gates.ts` |
| Daisy nodes | 54 | `src/nodes/NodeRegistry.ts` |

These four numbers are **not interchangeable**.

## DFRL gap on main (before this branch)

- **P-001..P-020:** AUTHORED_MODEL, explicit SMT (kept).
- **P-021..P-088:** `for` loop generated identical decrement-ranking SMT labeled `GENERATED_GENERALIZED_MODEL` — **not** theorem-specific.

## Import performed

- File `src/paradoxes/TheoremSpecific68.ts` from branch `dfrl/real-68-theorem-models` @ `808cdc6fecb1aff5dac874d519a7e55eb63938a4`.
- Replaces the generator loop in `paradoxData.ts`.
- Classifications: many `FINITE_ABSTRACTION` / `EXISTENTIAL_WITNESS` with **expected sat**; classical antinomies **unsat**.
- Status field uses `PROVISIONAL` where scope is not full classical universality — do not upgrade claim scope without domain-complete formalization.

## DH

- 32 unique `DH-P-001`..`DH-P-032` already present in `dhAuthoritativeFormalContracts.ts` on main.
- Expected SAT cases include DH-P-019, DH-P-031 (per aggregation script).

## Model weights (Daisy Haminja)

- **No GGUF/ONNX tensors** in git or previously verified ISO parts.
- Registry slot id: `daisy-haminja` → `models/gguf/daisy-haminja.Q4_K_M.gguf`.
- Inference remains **BLOCKED** until operator installs weights + local runner.
- Third-party cloud providers prohibited on first-party path.

## Dedicated external registry repo

`Solvex-Paradox-Box/Daisy-Haminja-AI---UAREFAKE-Registry-Problem-Solving-Engine` was **not found** via GitHub search from this environment (0 results). Cannot audit `registryData.ts` there without access.

## Verdict

**PARTIAL** on registry: authored 20 + theorem-specific 68 now wired; machine evidence still requires fresh `verify:120` CI on this SHA. Model path **BLOCKED** (no weights).
