# Canonical source and deployment reconciliation

**Finding (2026-10-27):** Live Vercel project previously inspected targets `iamfather420-ctrl/Uarefake-1`, **not** `iamfather420-ctrl/Full-Build`. Merging to Full-Build does **not** deploy to the production domain.

## Required operator decisions

1. **Which repo is canonical?** Full-Build (this tree) is treated as the integration source of truth for SOLVEX + Daisy work in this checklist.
2. **Which deployment should serve production?** Either:
   - Point the production Vercel project at Full-Build after staging acceptance, **or**
   - Merge verified Full-Build changes into the deployment repo via controlled PR, preserving archives.
3. **Never** force-push over unrecovered archive-only history or delete multi-part ISO/Smash assets.

## Pre-cutover checklist

- [ ] Staging deploy of Full-Build release candidate
- [ ] `/healthz` and `/readyz` fail closed without secrets
- [ ] Auth remains disabled until staging evidence
- [ ] Payments remain 410
- [ ] Chat returns BLOCKED without first-party model or explicit external opt-in
- [ ] Backup / rollback plan documented for the active Vercel project
- [ ] DNS / TLS verified on staging hostname first
- [ ] Post-cutover smoke: health, blocked payment, blocked chat, no secret leakage

## Safety

No deployment settings were changed by this documentation PR. Production cutover requires explicit human authorization after staging acceptance.
