# Recovery audit — SAT-witness artifact + dedicated Daisy registry

**Date:** 2026-10-28  
**Full-Build main:** `347174820bd49120427aaf91c1eb293410900d40`

## 1. Native Z3 SAT-witness recheck (preserved on main)

| Field | Value |
| --- | --- |
| Path | `artifacts/native-z3-sat-witness-recheck.json` |
| Report | `SAT_WITNESS_NATIVE_RECHECK.md` |
| Timestamp | 2026-10-10T01:45:52Z |
| Engine | system libz3 C API **4.13.3.0** (not project `z3-solver` WASM) |
| Aggregate | **120 SAT, 0 UNSAT, 0 UNKNOWN, 0 errors** |
| Replays / models / mutations | 120/120 SAT witnesses; 120/120 contradiction→UNSAT |
| Source commit | **not embedded** ("uploaded Full-Build-SAT-Witness-Fix archive") |
| WASM / npm pipeline | Explicitly **not** established |

### Critical consistency check

On main, DFRL-P-002 SMT is:

```text
(declare-const R Bool) (assert (= R (not R)))
```

Under standard SMT-LIB this is **UNSAT**. The native recheck records **SAT** for DFRL-P-001..120 including P-002.

Therefore the Oct 10 native run **cannot** be treated as proof that the *same* classical refutation scripts are being solved as written in current main `paradoxData.ts`. Possible explanations (unresolved):

- Different SMT corpus / wrappers in the archive used that day
- Harness that does not assert the full script the same way as WASM `fromString`
- Artifact from a SAT-oriented encoding (witness extraction) rather than pure refutation corpus

**Do not** claim activation-gate 120 or production formal readiness from this file alone. Treat it as historical native evidence under a different engine, with the caveats in the markdown report.

## 2. Dedicated registry repository (found)

- **Repo:** `Solvex-Paradox-Box/Daisy-Haminja-AI---UAREFAKE-Registry-Problem-Solving-Engine`
- **Revision inspected:** `776cf64a54ec60dd28bd633b21b569084a0280d1`
- **`src/data/registryData.ts`:**
  - `PARADOX_REGISTRY_88` built with **`Array.from({ length: 88 })`** formula + marketing names — **not** Full-Build formal SMT DFRL records
  - `REGISTRY_MODEL_WEIGHTS` = **dialecticWeight scalars** (0.45–0.95 style), **not** neural GGUF tensors
  - `MESH_TOPOLOGY_54` uses **`Math.random()`** for latency — not live infrastructure evidence
- **`server.ts`:** active **`@google/genai` / Gemini** (`gemini-3.6-flash`) synthesis paths — **third-party AI**, must not be imported into Full-Build first-party inference
- **`package.json`:** depends on `@google/genai`

### Integration rule

Reuse only **typed domain shapes / non-fabricated content** after review. Do **not** merge Gemini client or formula-generated paradox/IP/latency as canonical formal evidence into Full-Build.

## 3. Model weights (Daisy Haminja)

- **No GGUF/ONNX tensors** found in Full-Build or in the dedicated registry tree at the inspected revision.
- Registry "weights" ≠ model weights.
- Slot remains: `models/gguf/daisy-haminja.Q4_K_M.gguf` (operator-supplied).

## 4. Related repo

`Solvex-Paradox-Box/Autonomous-consolidated-B2B-solutions` — compare `brainData` / manifests for non-duplicative content; same Gemini caution applies until audited.

## 5. Next actions (ordered)

1. Keep Full-Build formal path on **WASM/project verifier** + expected sat/unsat matching; re-run `verify:120` on current SHA.
2. Diff native-recheck SMT hashes vs current `paradoxData.ts` / DH contracts (`source_sha256` in JSON).
3. Audit dedicated registry for any **real** checkpoint paths; isolate Gemini.
4. Do not enable production or claim first-party neural inference without an on-disk weight file.

**Verdict:** SAT artifact and dedicated registry **found and real**. Formal identity with current main SMT + neural Daisy weights **not** established. Production remains **BLOCKED**.
