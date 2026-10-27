# Work split — ChatGPT vs Grok (2026-10-27)

**main HEAD:** `347174820bd49120427aaf91c1eb293410900d40`  
**Verdict:** NOT PRODUCTION-READY. Do not enable AUTH_ENABLED, payments, or ALLOW_EXTERNAL_MODEL_PROVIDER.

## Done on main (do not re-litigate)

- Payments disabled (410 / PayPalAdapter no network)
- External model opt-in only; chat BLOCKED by default
- AuthService fail-closed (no local mint)
- Neon generic migrate/write blocked
- ApiRouter readiness BLOCKED
- Native UI modules present under Solvex-core (fail-closed shell)
- Archive ISO parts verified earlier (SHA match); no model weights in archive listing
- Activation requires fresh commit-bound evidence

## Still left

| Item | Owner |
| --- | --- |
| Fresh 120 + 46 evidence on HEAD; reconcile #53/#54 evidence endpoint with real CI artifacts | **ChatGPT** |
| Clear blocked gates only with real results (no simulated ACTIVE) | **ChatGPT** |
| Formal PR cluster rebase (#5 fold #1/#18; #14/#19) after evidence pipeline works | **ChatGPT** |
| Readiness doc truth, PR triage, fail-closed audits | **Grok** |
| Open PR close/hold recommendations; conflict detection vs main | **Grok** |
| Staging auth plan review (#47/#48) without enabling auth | **Grok** (audit) / **ChatGPT** (plan depth) |
| Inference scaffold (#49) review for fail-closed wiring | **Grok** audit; implement via PR author/Copilot |
| Typed Neon repos, staging Neon, deploy cutover, payments last | Later; human + staging |

## ChatGPT — exclusive focus

1. Bind `/api/evidence/paradox-ledger` (PR #53/#54) to artifacts whose `source_commit_sha` equals runtime commit.
2. Produce or locate **fresh** CI artifacts for HEAD (or RC), not `72862558…`.
3. Ensure ACTIVE is impossible unless 120/120, adversarial, 46/46 PASSED, roots match.
4. Document remaining non-passed gates with real CI links.
5. Never invent green formal results.

## Grok — exclusive focus

1. Keep PRODUCTION_READINESS_STATUS accurate.
2. PR inventory: merge / rebase / hold / close.
3. Verify fail-closed paths still hold after others land.
4. Do not own gate regeneration or formal Z3 runs.
