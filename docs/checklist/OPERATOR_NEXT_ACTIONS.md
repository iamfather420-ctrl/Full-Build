# Operator next actions — SOLVEX + Daisy Haminja

**Status: NOT PRODUCTION-READY.**  
**PayPal is not the only blocker.**

This document is for a human operator after the checklist source PRs are reviewed. It does not authorize production enablement by itself.

---

## 0. Preconditions

Before any staging or production work:

- [ ] Review and merge (or consciously defer) open checklist branches/PRs:
  - Native UI build-closure stubs
  - First-party auth foundation (keep `AUTH_ENABLED` unset)
  - First-party inference scaffold (no weights required to merge)
  - Typed domain repos / governance / docs / readiness aggregator
  - Marketplace governance wiring
- [ ] Prefer fail-closed behavior when resolving merge conflicts
- [ ] Confirm `main` still reports payments disabled and chat BLOCKED without explicit external-model opt-in
- [ ] Do **not** point production DNS or Vercel production at untested commits

---

## 1. Merge and baseline verify (CI)

1. Merge approved checklist PRs into `main` (or a release-candidate branch).
2. Ensure GitHub Actions complete on that SHA:
   - Build / TypeScript / enterprise invariants
   - 120-case formal verification (if workflow present)
   - Formal evidence hash stability (if present)
3. Locally (optional, offline safety only):

```bash
npm run verify:payments-disabled
npm run verify:governance          # after governance scripts are on the branch
npm run verify:evidence-freshness  # expect STALE until evidence is regenerated
npm run verify:archive             # expect INCOMPLETE until ISO parts are present
npm run verify:checklist           # hard safety must pass; soft incompleteness is OK
```

4. Record the **exact commit SHA** as the release candidate (RC).

**Stop if hard safety checks fail.**

---

## 2. Recover archives (UI modules + optional model assets)

Canonical release record: GitHub release `v0.1.0-daisy-ai-os`  
Manifest: `sources/smash-archive-manifest.txt`

1. Download **both** parts and checksum:
   - `Daisy-AI-OS-Complete-With-ISO.tar.part-00`
   - `Daisy-AI-OS-Complete-With-ISO.tar.part-01`
   - `Daisy-AI-OS-Complete-With-ISO.tar.sha256`
2. Reassemble and verify:

```bash
cat Daisy-AI-OS-Complete-With-ISO.tar.part-00 \
    Daisy-AI-OS-Complete-With-ISO.tar.part-01 \
  > Daisy-AI-OS-Complete-With-ISO.tar
sha256sum -c Daisy-AI-OS-Complete-With-ISO.tar.sha256
# or: compare sha256sum of the combined tar to the published checksum file
```

3. Extract offline; locate:
   - Original Solvex-core UI modules (`PaymentGateway`, `ParadoxLedger`, `JitFactory`, `CommandBar`, `data.ts`, `types.ts`, Vite entry files)
   - Any model weights / tokenizer / local engine binaries (if present)
4. Integrate **only** after review:
   - No simulated payments
   - No fabricated provider success
   - Prefer original modules over fail-closed stubs
5. If model assets exist:

```bash
export DAISY_MODEL_PATH=/secure/path/to/model
export DAISY_INFERENCE_ENGINE=/secure/path/to/engine   # CLI: --model --prompt
export DAISY_MODEL_ID=...
export DAISY_MODEL_VERSION=...
```

6. Re-run offline chat tests with network disabled for the first-party path.

**If archives cannot be recovered:** keep stubs and BLOCKED inference; do not invent replacements and call them original.

---

## 3. Staging database (auth + typed persistence)

Use a **disposable Neon branch**, never production first.

1. Snapshot / create branch from a known backup.
2. Review migrations (including `005_daisy_first_party_auth.sql` and any domain migrations).
3. Apply on the disposable branch only.
4. Verify:
   - RLS enabled + FORCE RLS on public tables
   - Runtime role cannot bypass RLS
   - Two-tenant adversarial reads/writes return isolation
5. Auth E2E on staging only (`AUTH_ENABLED=true` **staging**):
   - Register → email verify → login → `/me` → logout
   - Password reset / session revocation
   - Rate limit and account-enumeration checks
   - CSRF / Origin checks on cookie mutations
6. Typed repository write/read/idempotency/restart-readback tests for problems, offers, orders, audit.
7. Backup restore drill on a second disposable branch.

**Keep production `AUTH_ENABLED` unset/false until staging evidence is written and reviewed.**

---

## 4. Regenerate formal and gate evidence on the RC SHA

Stale `execution-gates.md` (other commits) is **not** proof for the RC.

1. Run authoritative 120-case + 46-gate / enterprise workflows on the **RC commit**.
2. Download hashed artifacts; confirm commit SHA in the report matches RC.
3. Confirm labels distinguish:
   - Formal corpus closure vs production activation
4. Attach artifacts to the release PR or release notes.
5. If any gate is `FAIL` / unexpected `BLOCKED`, fix or consciously accept; do not edit old JSON to invent a pass.

```bash
npm run verify:evidence-freshness   # should become COMMIT_MATCH only after regen on HEAD
```

---

## 5. Staging application deploy

1. Deploy RC to a **staging** Vercel (or other) project linked to `iamfather420-ctrl/Full-Build` — not a silent overwrite of production `Uarefake-1`.
2. Smoke checks:

| Check | Expected |
| --- | --- |
| `/api/system/health` or `/api/system/status` | Responds; `readiness: BLOCKED` or equivalent honest blocked state |
| `payments_enabled` | `false` |
| `/api/pay/create` | 410 / disabled |
| `/api/chat` without model + without external opt-in | 503 BLOCKED |
| Auth routes | Disabled or staging-only per config |
| No secrets in logs or client bundles | Confirmed |

3. Record staging URL, commit SHA, and smoke results.

---

## 6. Deployment reconciliation decision

Known issue: live project previously inspected targets `Uarefake-1`, not `Full-Build`.

Choose **one** path explicitly:

**A.** Point production deployment at Full-Build after staging acceptance, **or**  
**B.** PR verified Full-Build changes into the deployment repo with review.

Either way:

- [ ] Preserve multi-part archives and checksums
- [ ] Rollback plan (previous deployment) documented
- [ ] DNS/TLS verified on staging hostname before production hostname
- [ ] Post-cutover smoke (same table as §5)

**Do not cut over without a named human approval.**

---

## 7. Security and recovery drills (staging)

- [ ] Secrets only in platform secret store; rotation notes
- [ ] TLS on staging host
- [ ] Rate limits on mutating routes
- [ ] Session revocation works
- [ ] Tenant isolation adversarial test (HTTP + SQL)
- [ ] Backup restore rehearsal
- [ ] Rollback rehearsal
- [ ] Incident contact / severity path written down

---

## 8. Payments (last)

Keep PayPal and all capture paths **disabled** until §§1–7 have evidence.

Separate review required before any enablement:

- [ ] Sandbox credentials in secret store only
- [ ] Webhook signature verification
- [ ] Amount / currency / idempotency checks
- [ ] Reconciliation procedure
- [ ] Explicit authorization for live environment
- [ ] Independent security review recorded

No checklist item in this repo auto-enables payments.

---

## 9. Production gate (only when all above pass)

Production may be considered only when:

1. RC SHA has fresh 120 + 46 evidence attached  
2. Staging auth + persistence + isolation tests passed  
3. Archive integrity verified (or explicit accepted limitation documented)  
4. First-party inference ready **or** external provider explicitly authorized with documented residual risk  
5. Deployment source reconciled and rollback tested  
6. Payments policy still intentional (enabled only if §8 completed)  
7. Named human signs production authorization  

Until then, public status remains:

**NOT PRODUCTION-READY.**

---

## Quick reference — environment flags (defaults safe)

| Variable | Production default | Meaning |
| --- | --- | --- |
| `AUTH_ENABLED` | unset / false | First-party auth routes off |
| `ALLOW_EXTERNAL_MODEL_PROVIDER` | unset / false | No third-party chat |
| `DAISY_MODEL_PATH` / `DAISY_INFERENCE_ENGINE` | unset | First-party inference off |
| PayPal / payment enable flags | unset / false | Payments off |
| `SOLVEX_ENV` | not `production` until authorized | Claim scope stays non-production |

---

## Related docs

- `PRODUCTION_READINESS_STATUS.md`
- `docs/checklist/REMAINING_WORK_PROGRESS_20261027.md`
- `docs/gates/GATE_INVENTORY_AND_FRESHNESS.md`
- `docs/deployment/CANONICAL_SOURCE_RECONCILIATION.md`
- `docs/marketplace/WORKFLOW_TRUTH_BOUNDARIES.md`
- `docs/security/RELEASE_AND_SECURITY_GATES.md`
- `docs/inference/FIRST_PARTY_INFERENCE.md`
- `sources/smash-archive-manifest.txt`
