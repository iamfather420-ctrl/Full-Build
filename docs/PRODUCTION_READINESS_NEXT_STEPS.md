# Production Readiness Next Steps

Status reviewed: 2026-10-23. This document is a readiness tracker, not proof of readiness. Keep every gate BLOCKED until current, reproducible evidence is attached to the relevant commit and environment.

## Release safety invariants
- Canonical domain: `uarefake.space`.
- Production authentication/login remains disabled until all required security, tenant-isolation, recovery, and release gates pass.
- Payments/PayPal remain disabled. Do not activate payment flows as part of readiness work.
- Do not run migrations, restore operations, or destructive tests against production.
- Keep status transitions distinct: `PROPOSED != APPROVED != EXECUTED != VERIFIED`. Documentation or a passing isolated test alone does not prove production readiness.
- Any unavailable tool, missing credential, unexecuted test, or ambiguous result is BLOCKED with a reason.

## 1. Runtime database privileges and RLS (GATE-11)
- **Known prior finding:** the production role `solvex_runtime_login` was reported with elevated privileges (`CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`) and `neon_superuser` membership.
- **Candidate:** a restricted v2 runtime role was staged and audited on a disposable branch in prior work. Do not assume it has been promoted or that production is safe.
- **Next action:** on a non-production Neon branch, run `scripts/neon-gate11-readonly-audit.sql`; capture role flags/memberships, table RLS/forced-RLS and policy results, and `NeonPersistence.verifyRlsPosture()` output.
- **Evidence required:** timestamped before/after audit JSON, exact branch/commit, role membership query, and an explicit reviewed exception for internal migration metadata if applicable.
- **Status:** BLOCKED pending fresh, reproducible evidence.

## 2. Tenant isolation
- Execute `docs/ISOLATION_TEST_PLAN.md` using the restricted runtime role and trusted, short-lived synthetic signed claims on a non-production branch.
- Prove same-tenant reads work and cross-tenant reads/writes, missing/invalid/expired claims, indirect access paths, and applicable payment-table access fail closed.
- **Evidence required:** per-case results with exact role, branch ID, commit SHA, timestamp, and artifact path. Never include signing secrets or reusable tokens.
- **Status:** BLOCKED until the full plan has actually run and results are attached.

## 3. Identity architecture and authentication boundary (AGATE / OIDC)
- **Product direction:** evaluate the first-party AGATE identity/NFT design as the intended sovereign identity path; do not treat this direction as an implemented or production-validated authentication system.
- **Current release rule:** do not remove or bypass existing fail-closed OIDC/authentication checks until a reviewed replacement contract is implemented and proven equivalent or stronger for server-side authentication, session/token integrity, revocation, account recovery, tenant binding, replay resistance, and authorization.
- **Required design decisions/evidence:** specify issuer and verifier responsibilities; signed-claim format and key custody/rotation; expiry/audience/issuer checks; revocation and recovery; account-to-tenant binding; privacy and deletion boundaries; threat model; negative tests; and migration/rollback plan. An NFT or public chain identifier by itself is not proof of a person's legal identity or an authenticated session.
- **Privacy constraint:** do not put names, KYC records, contact details, or other direct personal information in immutable on-chain data. Keep only non-sensitive references/commitments on-chain; keep eligible PII off-chain and define verified deletion behavior. Document what cannot be erased from a public chain.
- **KYC constraint:** transaction/payment confirmation is not a substitute for identity verification. Do not enable KYC or payment processing without a separate approved, compliant design.
- **Evidence required:** architecture decision record, implemented server-side verifier, signed-claim tests, tenant-isolation results, security review, and recovery/revocation tests.
- **Status:** BLOCKED — design intent is recorded; implementation and production-grade evidence are not established by this document.

## 4. Disaster recovery
- Follow `docs/DR_RESTORE_PROCEDURE.md` using a scratch Neon branch only.
- Restore a recent database dump, validate schema and data, rerun the GATE-11 audit and complete isolation tests, and point a staging app at the restored database for health/readiness checks.
- **Evidence required:** restore command log, backup/run identifier, scratch branch identifier, post-restore audit, isolation transcript, and staging health-check output.
- **Status:** BLOCKED until an actual restore and post-restore verification are recorded. Backup existence or `pg_restore --list` alone is not a restore rehearsal.

## 5. 46 production gates and protocol audit
- Map each gate to its real implementation, automated test, fresh evidence artifact, responsible owner, and explicit verdict.
- Preserve provenance: reports must identify the exact source commit and test run. Do not reuse historical counts or stale reports as current proof.
- Prior evidence includes a successful 120-case corpus run, but that does not imply all 46 production gates are satisfied.
- **Status:** PARTIAL / BLOCKED for release until the complete gate-to-evidence mapping is reconciled.

## 6. Deployment, domains, monitoring, and runtime configuration
- Recheck the live Vercel project state, production-target deployment, canonical-domain verification/routing, secret availability, logs/alerts, health and readiness endpoints, and least-privilege database connectivity.
- Prior inspection reported `uarefake.space` domain verification pending and a production-target `DATABASE_URL` with an empty value. These are historical observations and must be rechecked before claiming current status.
- A READY preview deployment is not proof of a production deployment.
- **Status:** BLOCKED pending fresh environment evidence.

## Promotion gate
Do not enable production login/authentication, tenant mutations, or payments until sections 1–6 have current evidence, the identity architecture decision is approved, GATE-14 is unblocked, and the release verdict is explicitly VERIFIED by the required human authority. No documentation-only sign-off can satisfy a technical gate.
