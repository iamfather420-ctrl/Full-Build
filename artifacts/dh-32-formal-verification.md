# DH 32 Formal Verification Report

**Execution ID:** `dh_suite_1790883774548_x1etdi`  
**Commit SHA:** `b992445d00e6f8e27bd0aeaf308ad2f17a64d142`  
**Timestamp:** 2026-10-01T19:42:54.548Z  
**Status:** **VERIFIED**  
**Root Hash:** `f1053fccfdc95442b73714394b7b44ab96b38f7952e521637b5c36ff86dc014b`  

## Summary
- Total Cases: **32**
- Executed: **32**
- Expected Result Matches: **32**
- Cleanroom Replays: **32**
- Replay Matches: **32**
- UNSAT Count: **30**
- SAT Count: **2**
- UNKNOWN Count: **0**
- ERROR Count: **0**

## Reconciliation & Identity Mapping
| Original ID | Original Name | Public ID | Public Name | Match | Status | Action |
|:---|:---|:---|:---|:---:|:---|:---|
| DH-P-001 | Achilles and the Tortoise | DH-P-001 | Zeno's Achilles and the Tortoise | YES | DIRECT_MATCH | RETAIN_AND_VERIFY |
| DH-P-002 | Russell Set Paradox | DH-P-002 | Russell's Paradox (Naive Comprehension) | YES | DIRECT_MATCH | RETAIN_AND_VERIFY |
| DH-P-003 | Barber Paradox | DH-P-003 | Barber Paradox | YES | DIRECT_MATCH | RETAIN_AND_VERIFY |
| DH-P-004 | Liar Paradox | DH-P-004 | Liar Paradox (Epimenides) | YES | DIRECT_MATCH | RETAIN_AND_VERIFY |
| DH-P-005 | Grelling-Nelson Paradox | DH-P-009 | Grelling-Nelson (Heterological Paradox) | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-006 | Curry Paradox | DH-P-005 | Curry's Paradox | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-007 | Berry Paradox | DH-P-008 | Berry Paradox (Least Unnameable Integer) | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-008 | Richard Paradox | NONE | None (Absent from public repo) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-009 | Burali-Forti Paradox | DH-P-006 | Burali-Forti Paradox | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-010 | Cantor Paradox | DH-P-007 | Cantor's Paradox (Universal Cardinal) | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-011 | Sorites Paradox | DH-P-014 | Sorites Paradox (Heap of Sand) | YES | REMAPPED_FROM_PUBLIC | REMAP_AND_BOUND_SCOPE |
| DH-P-012 | Ship of Theseus | DH-P-013 | Ship of Theseus | YES | REMAPPED_FROM_PUBLIC | REMAP_AND_BOUND_SCOPE |
| DH-P-013 | Grandfather Paradox | DH-P-018 | Grandfather Paradox (Closed Timelike Curves) | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-014 | Bootstrap Paradox | NONE | None (Public DH-P-014 was Sorites) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-015 | Raven Paradox (Hempel) | NONE | None (Public DH-P-015 was Two Generals) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-016 | Goodman New Riddle of Induction (Grue) | NONE | None (Public DH-P-016 was FLP Impossibility) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-017 | Newcomb Problem | DH-P-021 | Newcomb's Paradox | YES | REMAPPED_FROM_PUBLIC | REMAP_AND_BOUND_SCOPE |
| DH-P-018 | Prisoner Dilemma | NONE | None (Public DH-P-018 was Grandfather) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-019 | Simpson Paradox | DH-P-019 | Simpson's Paradox | YES | DIRECT_MATCH | RETAIN_AND_VERIFY |
| DH-P-020 | Monty Hall Problem | DH-P-020 | Monty Hall Problem | YES | DIRECT_MATCH | RETAIN_AND_VERIFY |
| DH-P-021 | Birthday Paradox | NONE | None (Public DH-P-021 was Newcomb) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-022 | Banach-Tarski Paradox | DH-P-017 | Banach-Tarski Paradox | YES | REMAPPED_FROM_PUBLIC | REMAP_AND_BOUND_SCOPE |
| DH-P-023 | Gabriel Horn (Torricelli Trumpet) | NONE | None (Public DH-P-023 was St. Petersburg) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-024 | Olbers Paradox | NONE | None (Public DH-P-024 was Braess) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-025 | Fermi Paradox | NONE | None (Public DH-P-025 was Condorcet) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-026 | Twin Paradox | NONE | None (Public DH-P-026 was Allais) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-027 | EPR Paradox | NONE | None (Public DH-P-027 was Crocodile) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-028 | Schrodinger Cat Paradox | NONE | None (Public DH-P-028 was Pigeonhole) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |
| DH-P-029 | Zeno Arrow Paradox | DH-P-012 | Zeno's Arrow Paradox | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-030 | Zeno Dichotomy Paradox | DH-P-011 | Zeno's Dichotomy (Runner at the Track) | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-031 | Braess Paradox | DH-P-024 | Braess's Paradox | YES | REMAPPED_FROM_PUBLIC | REMAP_TO_ORIGINAL_ID |
| DH-P-032 | Byzantine Generals Paradox | NONE | None (Public DH-P-032 was Goldbach) | NO | AUTHORED_FOR_LOCAL_REGISTRY | AUTHORED_AUTHORITATIVE_CONTRACT |

## Individual Case Results
| Case ID | Name | Scope | Expected | Actual | Replay | Verified |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| DH-P-001 | Achilles and the Tortoise | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-002 | Russell Set Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-003 | Barber Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-004 | Liar Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-005 | Grelling-Nelson Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-006 | Curry Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-007 | Berry Paradox | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-008 | Richard Paradox | MODEL_VERIFIED_AXIOMATIC | unsat | unsat | unsat | PASS |
| DH-P-009 | Burali-Forti Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-010 | Cantor Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-011 | Sorites Paradox | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-012 | Ship of Theseus | MODEL_VERIFIED_AXIOMATIC | unsat | unsat | unsat | PASS |
| DH-P-013 | Grandfather Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-014 | Bootstrap Paradox | MODEL_VERIFIED_AXIOMATIC | unsat | unsat | unsat | PASS |
| DH-P-015 | Raven Paradox (Hempel) | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-016 | Goodman New Riddle of Induction (Grue) | MODEL_VERIFIED_AXIOMATIC | unsat | unsat | unsat | PASS |
| DH-P-017 | Newcomb Problem | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-018 | Prisoner Dilemma | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-019 | Simpson Paradox | MODEL_VERIFIED | sat | sat | sat | PASS |
| DH-P-020 | Monty Hall Problem | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-021 | Birthday Paradox | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-022 | Banach-Tarski Paradox | MODEL_VERIFIED_AXIOMATIC | unsat | unsat | unsat | PASS |
| DH-P-023 | Gabriel Horn (Torricelli Trumpet) | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-024 | Olbers Paradox | MODEL_VERIFIED_AXIOMATIC | unsat | unsat | unsat | PASS |
| DH-P-025 | Fermi Paradox | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-026 | Twin Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-027 | EPR Paradox | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-028 | Schrodinger Cat Paradox | MODEL_VERIFIED_BOUNDED | unsat | unsat | unsat | PASS |
| DH-P-029 | Zeno Arrow Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-030 | Zeno Dichotomy Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |
| DH-P-031 | Braess Paradox | MODEL_VERIFIED | sat | sat | sat | PASS |
| DH-P-032 | Byzantine Generals Paradox | MODEL_VERIFIED | unsat | unsat | unsat | PASS |

## Adversarial & Integrity Verification
- SMT Premise Mutation Test: **PASSED**
- Z3 Failure Injection Test: **PASSED**
- Artifact Tamper Alarm Test: **PASSED**
- Contract Hash Guard: **PASSED**
- Source Hash Guard: **PASSED**
- Replay Mismatch Guard: **PASSED**