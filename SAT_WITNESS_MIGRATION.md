# SAT Witness Migration — Reconciled Status

> **Status: BLOCKED / NOT COMPLETE.** The current committed DFRL registry is an UNSAT/refutation corpus, not a SAT-witness corpus. All 88 DFRL entries declare `expected_solver_result: 'unsat'`; the current verifier executes those exact SMT-LIB strings. The two corpora must not be described as 120 SAT witnesses.

## Current source-of-truth

- **DFRL (88):** `src/data/paradoxData.ts` declares all 88 expected results as UNSAT. Entries 1–20 contain individually authored SMT assertions; entries 21–88 are generated ranking-metric assertions. The latter are synthetic generalized models, not 68 independently authored paradox encodings. The assertions are the queries actually executed by `DFRLFormalVerifier`.
- **DH (32):** `src/formal/dhAuthoritativeFormalContracts.ts` declares a mixed SAT/UNSAT corpus. The current authoritative pipeline expects exactly two SAT contracts and 30 UNSAT contracts. A SAT result is accepted only when model assignments are extracted and the witness is reasserted in a fresh Z3 context.
- **Aggregation:** `scripts/verify_120_aggregation.ts` must report the actual result distribution and witness coverage. A 120/120 execution / expected-result / replay match is not equivalent to 120 SAT witnesses.
- **Activation:** formal-corpus success does not override the separate 46-gate activation boundary. Any blocked or external-provider-required gate keeps Daisy activation BLOCKED.

## What the current CI result proves

A passing 120-case workflow proves that, for that exact checked-out source revision and its configured Z3 WASM runner:

1. 88 DFRL queries were executed and matched their declared UNSAT expectations;
2. 32 DH queries were executed and matched their declared SAT/UNSAT expectations;
3. the configured replay checks matched;
4. the aggregation and adversarial checks accepted their evidence.

It does **not** prove that all 120 cases have SAT witnesses, that the 88 DFRL formulas are satisfiable, or that the unrestricted historical paradoxes are consistent.

## DFRL SAT-witness work — outstanding

The DFRL verifier currently has no model extraction or independent SAT-witness recheck. It deliberately refuses to mark a SAT result as proved. That is fail-closed, but it does not complete the requested migration.

The registry cannot be made into an 88-case SAT corpus by changing only the expected-result labels. Its current SMT assertions encode UNSAT queries, including direct contradictions and negated invariant checks. A genuine conversion requires, for each DFRL identity:

1. a reviewed bounded witness proposition that preserves the intended mathematical/system claim and explicitly states its scope and assumptions;
2. an SMT-LIB formula that actually encodes that proposition and is solver-SAT;
3. a concrete model extracted from the solver and checked for complete coverage of every free constant/function interpretation used by the formula;
4. independent reassertion of that complete witness in a new context, with SAT required;
5. a cleanroom replay, source/assertion/model hashes bound together, and negative mutation tests;
6. reviewed provenance for the generated generalized entries (DFRL-P-021 through DFRL-P-088), rather than treating generated templates as 68 independent authored paradox proofs.

Until those steps are completed and CI runs against the new source, retain the existing UNSAT expectations and label DFRL SAT-witness migration **BLOCKED**. Do not relabel UNSAT formulas as SAT, weaken proof criteria, hand-edit generated evidence, or infer a witness from a matching replay.

## DH witness implementation review — limitations to close

The current DH helper extracts only `declare-const` declarations with Bool, Int, or Real sorts. It scans the printed model for matching zero-argument `define-fun` entries, then reasserts those values in a new context. This is a useful fail-closed first pass for the current scalar SAT examples, but it is not a general SMT-LIB model serializer.

Before treating it as a complete independent witness checker, address and test these limitations:

- Function declarations, arrays, uninterpreted sorts, and function interpretations are not captured. If any SAT contract depends on them, a scalar-constant-only witness is incomplete and must be rejected.
- The parser relies on a regex plus a parenthesis-depth scan over printed model text. It is not a complete SMT-LIB tokenizer; quoted symbols, strings, escaped identifiers, and nested model forms need either a real parser or explicit fail-closed rejection.
- The witness is inserted by replacing every literal `(check-sat)`. If a formula has no such command, the assignments are never inserted; if it has multiple checks, assignments are injected at each one. Require exactly one supported check point or use a structured reconstruction path.
- The model hash currently fingerprints the serialized assignments, not a canonical tuple binding the original SMT source, contract hash, solver version, and recheck result. The surrounding evidence hashes should bind those inputs explicitly.
- The execution and replay use distinct contexts, but the replay should independently extract and validate its own complete witness; equal SAT statuses alone are not witness equality or proof.
- The DH verifier header comment must describe the implementation actually present; stale statements that no model extraction exists are incorrect.

A SAT case is verified only when the exact source formula plus the complete extracted model assignments is SAT in a fresh context. Unsupported or incomplete models remain BLOCKED.

## Required authoritative commands

```sh
npm run verify:dfrl
npm run verify:dh-formal
npm run verify:120
```

Run them after the source changes with the repository's declared, locked dependencies. Preserve the generated artifacts as outputs of that run; never edit them to manufacture a desired distribution.

## Historical evidence

The historical native-Z3 report dated 2026-10-10 is separate corroboration for the source snapshot it actually evaluated. It is not evidence that the current `z3-solver` WASM pipeline has completed a 120-SAT migration. Its claims must remain tied to its own source hash, report, and execution environment.
