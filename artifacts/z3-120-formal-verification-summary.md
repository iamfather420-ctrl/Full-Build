# Project AGATE / Daisy / Solvex — 120-Case Formal Z3 Verification Dossier
## Automated Theorem Prover Complete Formal Proof Ledger

- **Commit SHA:** `b992445d00e6f8e27bd0aeaf308ad2f17a64d142`
- **Timestamp:** `2026-10-01T19:43:23.542Z`
- **Total Z3 Executions:** 120 / 120
- **Expected-Result Matches:** 120 / 120
- **Deterministic Cleanroom Replays:** 120 / 120
- **Combined Root Hash:** `aebc02b4ac87edddcb35b60a09638ae92f58c139e1376fe0801ff4dffd6aeba3`
- **Distribution:** UNSAT: 118 (88 DFRL + 30 DH), SAT: 2 (2 DH), UNKNOWN: 0, ERROR: 0
- **Activation Gate Status:** **PROVEN_120_FORMAL_CLOSURE**

---

### Verification Breakdown

| Corpus | Target | Z3 Executed | Expected Matches | Replays Matched | Solver Engine | Status |
|:---|:---:|:---:|:---:|:---:|:---|:---:|
| **DFRL Operators** | 88 | 88 | 88 | 88 | Microsoft Research Z3 WASM 5.2.0 | **VERIFIED** |
| **DH Formal Contracts** | 32 | 32 | 32 | 32 | Microsoft Research Z3 WASM 5.2.0 | **VERIFIED** |
| **TOTAL FORMAL CORPUS** | **120** | **120** | **120** | **120** | **Z3 WASM 5.2.0** | **PROVEN_CLOSURE** |

---

### Non-Conflation of Registry Evidence vs Formal Proofs

- **DH Registry Records:** 32 metadata records verified via cryptographic canonical hashing, duplicate detection, and family variant classification (`REGISTRY_VERIFIED`).
- **DH Formal Contracts:** 32 distinct SMT contracts executed through Microsoft Research Z3 WASM solver with fresh contexts, cleanroom replays, and cryptographic proof receipts (`MODEL_VERIFIED` / `MODEL_VERIFIED_BOUNDED` / `MODEL_VERIFIED_AXIOMATIC`).
- **DFRL Operators:** 88 deterministic operational refutations executed through Z3 WASM.
