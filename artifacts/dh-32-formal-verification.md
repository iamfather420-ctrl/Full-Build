# DH 32-Case Formal Z3 SMT Verification Dossier
## Automated Theorem Prover Machine Verification Audit

- **Execution ID:** `dh32_exec_1790881814818`
- **Commit SHA:** `728625581c2f89210c752d03fda0a154812b2366`
- **Solver Engine:** `z3-wasm (Microsoft Research Z3 WASM 5.2.0)`
- **Verification Root Hash:** `3a04ec827c6867224cbde98a92bb3a05275a27061516e7e259d2ee96762b59dc`
- **Total Cases:** 32 / 32 Executed
- **Expected Result Matches:** 32 / 32
- **Deterministic Cleanroom Replays:** 32 / 32
- **Distribution:** UNSAT: 30, SAT: 2, UNKNOWN: 0, ERROR: 0
- **SMT Mutation Detection:** PASSED (UNSAT -> SAT confirmed)
- **Z3 Fault Injection (Fail-Closed):** PASSED (error, verified=false, fail-closed enforced)
- **Tamper Detection Alarm:** PASSED (Alarm Triggered)

### Complete Proposition Matrix (32 DH Formal Cases)

| Case ID | Name | Domain | Scope | Expected | Actual | Replay | Verified |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|
| `DH-P-001` | Zeno's Achilles and the Tortoise | `MATHEMATICAL_ANALYSIS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-002` | Russell's Paradox (Naive Comprehension) | `SET_THEORY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-003` | Barber Paradox | `FIRST_ORDER_LOGIC` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-004` | Liar Paradox (Epimenides) | `SEMANTIC_LOGIC` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-005` | Curry's Paradox | `PROOF_THEORY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-006` | Burali-Forti Paradox | `ORDINAL_ARITHMETIC` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-007` | Cantor's Paradox (Universal Cardinal) | `SET_THEORY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-008` | Berry Paradox (Least Unnameable Integer) | `COMPUTATIONAL_COMPLEXITY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-009` | Grelling-Nelson (Heterological Paradox) | `SEMANTICS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-010` | Yablo's Paradox | `MODAL_LOGIC` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-011` | Zeno's Dichotomy (Runner at the Track) | `MATHEMATICAL_ANALYSIS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-012` | Zeno's Arrow Paradox | `PHYSICS_CALCULUS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-013` | Ship of Theseus | `ONTOLOGY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-014` | Sorites Paradox (Heap of Sand) | `FUZZY_LOGIC` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-015` | Two Generals Problem | `DISTRIBUTED_SYSTEMS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-016` | FLP Impossibility (Fischer-Lynch-Paterson) | `DISTRIBUTED_SYSTEMS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-017` | Banach-Tarski Paradox | `MEASURE_THEORY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-018` | Grandfather Paradox (Closed Timelike Curves) | `CAUSAL_ANALYSIS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-019` | Simpson's Paradox | `STATISTICAL_INFERENCE` | `MODEL_VERIFIED` | `sat` | `sat` | `sat` | `VERIFIED` |
| `DH-P-020` | Monty Hall Problem | `PROBABILITY_THEORY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-021` | Newcomb's Paradox | `DECISION_THEORY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-022` | Unexpected Hanging Paradox | `EPISTEMIC_LOGIC` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-023` | St. Petersburg Paradox | `EXPECTED_UTILITY` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-024` | Braess's Paradox | `GAME_THEORY / ROUTING` | `MODEL_VERIFIED` | `sat` | `sat` | `sat` | `VERIFIED` |
| `DH-P-025` | Condorcet Voting Paradox | `SOCIAL_CHOICE` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-026` | Allais Paradox | `BEHAVIORAL_ECONOMICS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-027` | Crocodile Paradox | `CLASSICAL_DILEMMA` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-028` | Pigeonhole Collision Theorem | `DISCRETE_MATHEMATICS` | `MODEL_VERIFIED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-029` | Collatz Conjecture Convergence Bound | `NUMBER_THEORY` | `MODEL_VERIFIED_BOUNDED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-030` | Riemann Hypothesis Non-Trivial Zero Alignment | `COMPLEX_ANALYSIS` | `MODEL_VERIFIED_AXIOMATIC` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-031` | P vs NP Polynomial Separation Hypothesis | `COMPUTATIONAL_COMPLEXITY` | `MODEL_VERIFIED_AXIOMATIC` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
| `DH-P-032` | Goldbach Bounded Prime Decomposition | `ADDITIVE_NUMBER_THEORY` | `MODEL_VERIFIED_BOUNDED` | `unsat` | `unsat` | `unsat` | `VERIFIED` |
