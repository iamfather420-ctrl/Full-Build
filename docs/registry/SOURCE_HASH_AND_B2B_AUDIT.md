# Source-hash mismatch + B2B brain-data audit (2026-10-28)

## 1. Native SAT-recheck vs current formal sources

Native artifact (`artifacts/native-z3-sat-witness-recheck.json`) recorded:

| Path | Recorded SHA-256 (Oct 10 archive) |
| --- | --- |
| `src/data/paradoxData.ts` | `e5245e1be279e42b553e4ca4233283735c13ff2de82008d999def06d199b023d` |
| `src/formal/dhAuthoritativeFormalContracts.ts` | `0cf04a44a09ff9810bed43bc555c257dd1878584e1ecbd45b55522d35f26c914` |

### Current hashes (computed 2026-10-28)

| Ref | `paradoxData.ts` | Match? |
| --- | --- | --- |
| `main` @ 34717482 | `3ba4803b28be1e17176e2a684c8d08e08b40ed111f27e690955692fb6931577b` (15056 B) | **MISMATCH** |
| `feat/canonical-registry-daisy-haminja-20261028` | `b2943a5fc33138e7bba5cce0fc0f95a4a0ef51c7d7a238175c892bd136d4aef5` (15460 B) | **MISMATCH** |

| Ref | `dhAuthoritativeFormalContracts.ts` | Match? |
| --- | --- | --- |
| `main` and feature branch | `018e24046210488c3c08eca877dc4a5d7ce1c80623a96f4ed7f9e1824eaa5861` (34382 B) | **MISMATCH** |

**Conclusion:** The Oct 10 native 120-SAT run was against a **different source snapshot** than current main/feature formal files. It cannot be used as pass evidence for current HEAD formal gates without re-execution on matching SHAs.

Additionally, classical script `DFRL-P-002` on current main is `R = not R` (expected **unsat** under standard SMT-LIB). Native artifact lists P-002 as **sat** — reinforces corpus/harness divergence.

## 2. B2B consolidated repo audit

**Repo:** `Solvex-Paradox-Box/Autonomous-consolidated-B2B-solutions`  
**Files:** `src/data/brainData.ts`, `src/lib/brainDataManifest.ts`

| Asset | Content | Reuse in Full-Build formal path? |
| --- | --- | --- |
| `PARADOXES` (59 chamber items) | Narrative mesh/system paradoxes | **No** as SMT DFRL substitutes |
| `PARADOX_MATRIX_88` | Sparse classical names + narrative resolutions; **not** full 88 SMT scripts | **No** as formal evidence |
| `BRAIN_DATA_MANIFEST` | Chamber taxonomy, claims “resolved” | Documentation only; not machine proof |
| `SYSTEM_MANIFEST_DATA` | Short payload hashes, 54-node telemetry claims | **Not** live evidence |
| Gemini / genai in this tree (code search) | 0 hits in indexed search | Lower third-party risk than dedicated registry |

**Rule:** Do not import narrative “resolved” claims as formal verification status. Full-Build remains authoritative for DFRL/DH SMT via `paradoxData.ts` + theorem-specific models + DH contracts.

## 3. WASM / project verify:120

Not executed in this agent environment (no project `npm ci` / z3-solver WASM run completed here). Operator/CI must run on feature branch SHA after PR.

## 4. Remaining blockers (updated)

1. **Fresh formal CI** on feature branch SHA (WASM `verify:120`).
2. **Daisy Haminja GGUF** still absent.
3. **Gemini** isolation in dedicated registry (do not merge).
4. Payments / auth / production still **BLOCKED**.

**Verdict:** Hash mismatch **confirmed**. Native 120-SAT is historical only. B2B brain data is narrative/product taxonomy, not formal SMT corpus.
