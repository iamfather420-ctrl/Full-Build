# Neon GATE-11 current production security audit

**Audit date:** 2026-11-21  
**Project:** SolveX / `flat-unit-34950816`  
**Production branch:** `br-soft-dawn-b4wkrjox`  
**Database:** `neondb`

This document replaces the October 20 snapshot. Findings below were re-read from the current production branch. This PR does not apply schema or role changes to production.

## Current production findings

### Runtime roles

- `solvex_runtime_login`: LOGIN=true; CREATEDB, CREATEROLE, REPLICATION, and BYPASSRLS=true; inherits `neon_superuser`. This legacy role is not suitable for application runtime.
- `solvex_runtime_login_v2`: LOGIN=true; SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, and BYPASSRLS=false; does not inherit `neon_superuser`. This is the intended least-privilege application login.
- `solvex_app_runtime`: NOLOGIN, all elevated flags false.

Production read-only inspection confirms the v2 role exists. It does **not** prove that the deployed API's `DATABASE_URL` / `NEON_DATABASE_URL` uses it. That connection-path confirmation remains required before production certification.

### RLS coverage

Current production contains **40 public base tables**:
- 36 have RLS enabled and forced.
- Four do not have RLS: `_migrations`, `auth_sessions`, `outreach_events`, and `outreach_prospects`.
- `_migrations` is migration metadata and is not granted to the v2 runtime login.
- `outreach_events` and `outreach_prospects` are not directly granted to the v2 runtime login.
- `auth_sessions` is the material exception: v2 currently has SELECT/INSERT/UPDATE/DELETE, but the table has no RLS policy. PR #155 adds the missing session boundary using the exact opaque session ID.

### Payment safety

`payment_orders`, `payment_fulfillments`, `payment_refunds`, and `payment_events` all currently have RLS enabled and forced, with a default-deny policy (`USING (false)` / `WITH CHECK (false)`). The v2 runtime login has no SELECT or INSERT grant on these tables. This is the intended fail-closed posture while PayPal remains disabled. Do not replace these policies with tenant-access policies as part of GATE-11.

### Tenant policy audit

The current production policy scan found **zero** public policies containing an `OWNER` bypass in either `USING` or `WITH CHECK`.

## Disposition of the October candidate

The previous `neon-gate11-remediation-candidate.sql` was based on a stale 37-table snapshot and attempted to create a differently named role (`solvex_runtime_v2`) and replace payment default-deny policies with tenant-access policies. It is unsafe for the current production schema and has been removed from this PR.

The October audit's payment remediation is not needed in its original form: current production already forces RLS and denies access to all four payment tables. The remaining identified application-data RLS gap is `auth_sessions`, tracked in PR #155.

## Required remaining gates

1. Merge and apply PR #155 only after confirming a production recovery point and an approved change window.
2. Confirm deployed API connections use `solvex_runtime_login_v2`, not `solvex_runtime_login`.
3. Verify the deployed OIDC authorization-code/PKCE callback, session refresh, session retrieval, logout, and signed tenant A/B replay.
4. Keep PayPal and production auth activation disabled until the live end-to-end gates pass.

No production schema, role, secret, or persistent session was changed during this audit.
