# Operator onboarding guide — SOLVEX + Daisy Haminja

**Audience:** Humans who will build, stage, verify, or operate this system.  
**System status:** **NOT PRODUCTION-READY.**  
**Core rule:** Evidence before claims. Authorization before execution. Fail closed when unsure.

This guide orients you. It does not grant production authority or replace security review.

---

## 1. What this project is

SOLVEX + Daisy Haminja is intended as a **sovereign enterprise OS**: formal verification, multi-tenant marketplace/workflows, first-party auth, local-first inference where possible, and strict boundaries around payments and external AI providers.

The repository `iamfather420-ctrl/Full-Build` is the **integration source of truth** for current engineering work. A previously inspected live Vercel deployment may still track a different repo (`Uarefake-1`). **Merging here does not automatically deploy production.**

Daisy’s foundational instruction (`DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md`) defines identity, truth-before-appearance, human authority, and fail-closed behavior. Prefer that document when behavior questions arise.

---

## 2. Mental model (non-negotiables)

| Principle | Meaning in practice |
| --- | --- |
| Capability ≠ authority | Code can do something; that does not mean it may run in production |
| Fail closed | Missing evidence, secrets, or config → BLOCKED, not a fake success |
| No simulated intelligence | Chat without a real model/provider returns an explicit error |
| No simulated money | Payments stay disabled until a separate, reviewed enablement |
| Local ≠ production | Green local/CI checks are not production readiness |
| Stale evidence is invalid | Gate reports must match the commit under review |

If a dashboard, log line, or AI suggestion claims “ready” without matching artifacts for **this** commit, treat it as **unverified**.

---

## 3. Repository map (where to look)

| Area | Location |
| --- | --- |
| Native UI + chat server | `Solvex-core/` |
| Brain, nodes, proofs, marketplace | `src/` |
| Auth (foundation may be on a PR branch) | `src/auth/`, `src/daisy/auth/` |
| Inference contracts | `src/inference/` |
| Neon persistence | `src/database/` |
| Payments (disabled) | `src/payments/` |
| Formal / gate machinery | `src/proofs/`, `scripts/verify_*.ts` |
| Archive provenance | `sources/smash-archive-manifest.txt` |
| Readiness & checklist docs | `PRODUCTION_READINESS_STATUS.md`, `docs/checklist/`, `docs/ops/` |
| Operator next actions | `docs/checklist/OPERATOR_NEXT_ACTIONS.md` |

---

## 4. Safety defaults (do not “fix” these to go faster)

| Control | Safe default | Risk if forced on |
| --- | --- | --- |
| `AUTH_ENABLED` | unset / false | Exposed or half-wired auth |
| `ALLOW_EXTERNAL_MODEL_PROVIDER` | unset / false | Prompts leave the machine without explicit consent |
| `DAISY_MODEL_PATH` / engine | unset | N/A — first-party chat stays BLOCKED |
| PayPal / payment flags | disabled | Real money movement without controls |
| `SOLVEX_ENV=production` | not set until authorized | False production claim scope |
| Neon generic migrations/writes | blocked in code | Schema damage / wrong contracts |

**Never commit secrets.** Use the host’s secret store for any staging credentials.

---

## 5. First-week onboarding checklist

### Day 1 — Read and orient

- [ ] Read this guide and `DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md`
- [ ] Read `PRODUCTION_READINESS_STATUS.md` (current section, not only historical notes)
- [ ] Skim `docs/checklist/OPERATOR_NEXT_ACTIONS.md`
- [ ] Confirm you know: payments are off; production is not authorized

### Day 1–2 — Obtain the source

- [ ] Clone `iamfather420-ctrl/Full-Build`
- [ ] Note current `main` SHA (`git rev-parse HEAD`)
- [ ] List open PRs related to auth, inference, UI, governance (do not merge without review)

### Day 2 — Local tooling

- [ ] Install dependencies per project lockfile policy (`bun.lock` / npm as documented in CI)
- [ ] Run offline safety scripts when present:

```bash
npm run verify:payments-disabled
npm run verify:checklist   # hard safety must pass; soft incompleteness is expected
```

- [ ] Do **not** expect full 120-case Z3 or native UI production build until deps + archives are in place

### Day 3 — Understand blocked surfaces

Intentionally try (on a local/dev process only):

- [ ] Payment create → expect disabled / 410-class response
- [ ] Chat without model and without external opt-in → expect BLOCKED
- [ ] System status → expect honest `readiness: BLOCKED` (or equivalent)

Document what you observed; do not “fix” endpoints to return success.

### Day 4+ — Deeper tracks (pick with a lead)

| Track | You will work on | You must not |
| --- | --- | --- |
| Archive recovery | ISO parts, checksums, original UI modules | Invent demo UI and call it original |
| Auth staging | Disposable Neon, RLS, session E2E | Enable auth on production first |
| Inference | Real weights/engine when recovered | Ship mock “AI” replies |
| Evidence | Regenerate gates on RC SHA | Reuse stale reports |
| Deploy | Staging project linked to Full-Build | Silent production cutover |

---

## 6. Local run (development posture)

Exact scripts depend on the branch. Typical pattern:

```bash
# Install (follow CI: frozen lockfile when possible)
# bun install --frozen-lockfile   # or npm ci when lockfile is consistent

# Dev server (root or Solvex-core — see package.json / Solvex-core docs)
npm run dev
```

Environment for **safe** local exploration:

```bash
# Leave unset unless you deliberately accept the risk:
# AUTH_ENABLED
# ALLOW_EXTERNAL_MODEL_PROVIDER
# PAYPAL_* / payment enable flags
# SOLVEX_ENV=production
```

If you must test the Gemini adapter: set `ALLOW_EXTERNAL_MODEL_PROVIDER=true` and `GEMINI_API_KEY` only in a private env file that is gitignored, and treat all outputs as third-party-dependent.

---

## 7. Verification culture

### What “passing” means

| Claim | Requires |
| --- | --- |
| Payments disabled | `verify:payments-disabled` + code review of adapter/routes |
| Formal corpus OK | 120-case workflow on **this** commit + artifacts |
| Gates OK | 46-gate / enterprise report on **this** commit |
| Auth ready | Staging E2E + RLS adversarial evidence |
| Inference ready | Local model probe `ready: true` + offline generation test |
| Production ready | Named human sign-off after staging, evidence, deploy reconciliation |

### What does **not** count

- A single green unit test
- A polished UI screenshot
- An old `execution-gates.md` from another SHA
- “It worked on my machine” without artifacts
- An AI assistant asserting readiness without repo evidence

---

## 8. Incident and escalation basics

Until a formal on-call roster exists:

1. **Stop** consequential changes (deploy, secrets, DB, DNS).
2. **Preserve** logs and the exact commit SHA.
3. **Prefer rollback** to the last known staging/production deployment over forward “fixes” under pressure.
4. **Never** disable fail-closed checks to clear an alert.
5. Escalate to the repository owner / designated lead with: time, SHA, environment, observed vs expected, and whether data or money could have been affected (payments should still be off).

---

## 9. Communication standards

When reporting status, use this shape:

```text
Commit: <sha>
Environment: local | staging | production
What changed: <bullets>
What was verified: <command or CI run + result>
What remains BLOCKED: <bullets>
Evidence links: <CI / artifacts / notes>
Production ready: no | yes (only with sign-off reference)
```

Avoid: “basically done,” “should be fine,” “AI said it’s fixed.”

---

## 10. Related documents

| Doc | Purpose |
| --- | --- |
| `DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md` | Product/ethics operating rules for Daisy |
| `PRODUCTION_READINESS_STATUS.md` | Current readiness verdict |
| `docs/checklist/OPERATOR_NEXT_ACTIONS.md` | Ordered post-merge operator steps |
| `docs/checklist/REMAINING_WORK_PROGRESS_20261027.md` | Checklist progress matrix |
| `docs/gates/GATE_INVENTORY_AND_FRESHNESS.md` | 120 / 46 evidence rules |
| `docs/deployment/CANONICAL_SOURCE_RECONCILIATION.md` | Full-Build vs deploy repo |
| `docs/marketplace/WORKFLOW_TRUTH_BOUNDARIES.md` | Commerce boundaries |
| `docs/security/RELEASE_AND_SECURITY_GATES.md` | Security/release gates |
| `docs/inference/FIRST_PARTY_INFERENCE.md` | Local model configuration |
| `sources/smash-archive-manifest.txt` | Archive provenance |
| `execution-gates.md` | Historical gate report (check SHA!) |

---

## 11. Welcome criteria — you are onboarded when you can

1. State the production verdict (**not ready**) and why PayPal is not the only blocker.  
2. Name three fail-closed controls (payments, external model opt-in, blocked generic Neon writes).  
3. Find the foundational system instruction and the operator next-actions doc.  
4. Run at least one offline safety verify script and interpret pass vs soft incompleteness.  
5. Refuse a request to “just enable payments” or “just set production” without evidence and authorization.

Welcome. Move carefully; preserve the work; prefer truth over speed.
