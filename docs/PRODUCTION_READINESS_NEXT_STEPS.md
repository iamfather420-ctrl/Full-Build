# Production Readiness Next Steps

Status as of 2026-10-21. Items remain **BLOCKED** until real evidence is recorded. Do not mark complete from documentation alone.

## 1. Database permissions (GATE-11 role / RLS)
- **Current:** Production login `solvex_runtime_login` has elevated flags (`CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`) and inherits `neon_superuser`.
- **Candidate:** PR #17 stages `solvex_runtime_v2` with only `solvex_app_runtime` membership and strict tenant RLS (no OWNER bypass).
- **Action:** Apply candidate only on a non-production Neon branch. Re-run `scripts/neon-gate11-readonly-audit.sql`. Confirm `rolbypassrls = false`, no elevated membership, forced RLS + policy on every tenant-scoped table.
- **Evidence required:** Audit JSON before/after, role membership query, `NeonPersistence.verifyRlsPosture()` output.
- **Status:** BLOCKED

## 2. Customer isolation
- **Action:** On the validated branch, create two tenants. Using a signed claim for tenant A, attempt SELECT/INSERT/UPDATE against tenant B rows (direct table, via functions if any, payment tables, and any views). Expect zero rows and RLS rejection on writes.
- **Evidence required:** Test transcript showing cross-tenant attempts fail closed; same-tenant reads succeed.
- **Status:** BLOCKED

## 3. Authentication and human authorization
- **Action:** Keep production login disabled. Verify `solvex_private.auth_context_ready()` and signed-claim path. Confirm unauthenticated production API access fails closed (see PR #10).
- **Evidence required:** Auth readiness query, fail-closed API test output.
- **Status:** BLOCKED

## 4. Disaster recovery
- **Action:** Follow `docs/DR_RESTORE_PROCEDURE.md`. Restore latest `solvex-neon-backup-*.dump` to a scratch Neon branch. Point a staging app at it. Re-run isolation tests. Confirm application health.
- **Evidence required:** Restore log, post-restore isolation transcript, health-check output.
- **Status:** BLOCKED (backup artifacts exist; restore not yet executed)

## 5. 46-gate / protocol audit
- **Action:** Map each gate/protocol to current code path, automated test, and fresh evidence artifact. Anything without current evidence stays BLOCKED.
- **Status:** PARTIAL (120-case corpus re-run passed; full mapping incomplete)

## 6. Final production checks
- **Action:** Deployment health/readiness endpoints, monitoring, least-privilege runtime confirmation, end-to-end isolation under new role, security regression.
- **Status:** NOT STARTED

## Gate
Production login remains disabled until items 1–4 have recorded evidence and GATE-14 is no longer blocked.
