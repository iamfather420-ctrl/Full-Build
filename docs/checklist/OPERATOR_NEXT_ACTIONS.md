# Operator next actions (after merging checklist PRs)

These steps require human-held secrets, archives, or staging infrastructure. Source PRs alone cannot finish them.

## 1. Merge order (suggested)

1. Native UI build-closure stubs  
2. Auth foundation (#48) — keep `AUTH_ENABLED` unset  
3. Inference runtime scaffold (#49) — no weights required to merge  
4. Typed repos / governance / docs aggregator branches  
5. Marketplace governance wiring  

Resolve conflicts favoring fail-closed behavior.

## 2. Staging Neon (auth + typed persistence)

1. Create disposable Neon branch from backup  
2. Review migrations `005_daisy_first_party_auth.sql` (+ any domain migrations)  
3. Apply; verify RLS / FORCE RLS / non-bypass role  
4. E2E: register → verify email → login → `/me` → logout → reset  
5. Two-tenant isolation adversarial tests  
6. Only then consider `AUTH_ENABLED=true` on staging — never production first  

## 3. Model / archive recovery

1. Download release `v0.1.0-daisy-ai-os` part-00, part-01, sha256  
2. `cat part-00 part-01 > combined.tar` and match checksum  
3. Extract; locate original Solvex-core UI modules and any model weights  
4. Replace fail-closed stubs only with verified originals  
5. Set `DAISY_MODEL_PATH` + `DAISY_INFERENCE_ENGINE` if weights/engine exist  

## 4. Fresh evidence on RC commit

```bash
npm run verify:evidence-freshness   # expect STALE until regenerated
# Then run GitHub Actions 120-case + enterprise CI on the RC SHA
# Attach artifacts to the release PR; require commit match
```

## 5. Deployment

1. Staging deploy of Full-Build (not silent overwrite of `Uarefake-1`)  
2. Confirm `/api/system/status` shows `readiness: BLOCKED`, `payments_enabled: false`  
3. Human decision on cutover after staging acceptance  

## 6. Payments

Leave disabled until 1–5 have written evidence and a separate security review.

**Production verdict stays NOT READY until the above evidence exists.**
