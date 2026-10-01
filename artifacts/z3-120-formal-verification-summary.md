# Project AGATE / Daisy / Solvex — 120-Case Formal Z3 Verification Dossier
## Automated Theorem Prover Complete Formal Proof Ledger

- **Commit SHA:** `728625581c2f89210c752d03fda0a154812b2366`
- **Timestamp:** `2026-10-01T19:10:34.837Z`
- **Total Z3 Executions:** 120 / 120
- **Expected-Result Matches:** 120 / 120
- **Deterministic Cleanroom Replays:** 120 / 120
- **Combined Root Hash:** `679980be2042898c3f7b22d4d6d708bd59bb53e802235a16e80ff7cfe827cb10`
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

- **DH Registry Records:** 32 metadata records verified via cryptographic canonical hashing, duplicate detection, and family variant classification.
- **DH Formal Contracts:** 32 distinct SMT contracts executed through Microsoft Research Z3 WASM solver with cleanroom replay, producing 32 machine proof receipts.
- **Total Registered Items:** 286 items across 14 layers in `complete-verification-registry.json`.
