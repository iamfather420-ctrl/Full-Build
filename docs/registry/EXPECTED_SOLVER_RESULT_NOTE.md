# DFRL expected_solver_result

After importing theorem-specific P-021..P-088, many models are **existential / finite abstractions** with `expected_solver_result: 'sat'`.

The verifier must **not** require all 88 to be UNSAT.

- `proved` means: observed solver result equals the record's expected result (default `unsat`).
- `verify_120` `dfrlCasesValid` must use the same rule (see DFRLFormalVerifier + aggregation patch).
- Mutation tests must target an operator that expects **unsat** (e.g. P-001..P-020).
