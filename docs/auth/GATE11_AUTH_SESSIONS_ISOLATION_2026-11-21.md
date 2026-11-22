# GATE-11 current authentication and database reconciliation

**Updated:** 2026-11-21  
**Canonical auth path:** existing OIDC authorization-code + PKCE flow, backed by the existing SolveX users/tenants/memberships/roles model and Neon-signed tenant claims. PR #48's opt-in first-party password/session product is not a second identity authority and is not enabled.

## Current scope

The production database is not to be changed by this PR. The work is a migration candidate plus an application implementation and repeatable disposable-branch verification.

The existing API session store is `public.auth_sessions(sid, sess, expire)`. The session payload contains OIDC tokens and the signed tenant claim, but the table has no tenant_id. Tenant RLS cannot be applied by simply adding a tenant predicate because the API must first retrieve the opaque session to obtain its verified tenant claim. Instead, the session boundary is the 256-bit random opaque `sid`, and every read/write/delete sets `app.session_sid` in the same SQL statement that performs the operation. The policy permits only an exact sid match. Missing or mismatched context returns no rows and rejects writes.

## Changes in this branch

- `packages/db/migrations/0002_auth_sessions_sid_rls.sql`: enables and forces RLS on `auth_sessions`, installs exact-session-id USING/WITH CHECK policy, revokes PUBLIC table privileges, and grants CRUD to the existing non-login `solvex_app_runtime` role.
- `artifacts/api-server/src/lib/auth.ts`: uses the Neon SQL client for session CRUD, validates 64-character lowercase hexadecimal IDs, and applies session context in a materialized CTE in the same statement as each operation.
- `packages/db/src/index.ts`: exports the existing Neon SQL client for the API session module.
- `scripts/neon-gate11-auth-sessions-isolation-test.sql`: disposable-branch test that proves no-context denial, matching-id visibility, mismatched-id denial, update/delete, and cleanup. It rolls back the synthetic row.

## Validation performed

On the dedicated non-production `SOLVEX_ISOLATION_TEST` branch using `solvex_runtime_login_v2`:

- Runtime role is a member of `solvex_app_runtime`.
- Runtime role has SELECT/INSERT/UPDATE/DELETE on `auth_sessions`.
- Runtime role has no SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, or REPLICATION flags.
- `auth_sessions` RLS is ENABLED and FORCED, with the exact `app.session_sid` policy.
- No session context: 0 visible rows.
- Matching 64-character session id: exactly 1 visible row.
- Different session id: 0 visible rows.
- Update and delete with matching id succeeded; cleanup left 0 rows.

The disposable branch contained 0 pre-existing session rows before the test. No production schema, credentials, or persistent session data were changed.

## Remaining production gates

- Apply the migration only after a confirmed production recovery point and approved change window.
- Confirm the deployed API's `DATABASE_URL`/ `NEON_DATABASE_URL` authenticates as `solvex_runtime_login_v2`, not the elevated legacy login.
- Run the existing full OIDC sign-in, callback, refresh, session retrieval, logout, and tenant A/B signed-token replay through the deployed application.
- Keep production auth mode and PayPal disabled until those checks pass.

This change does not claim production OIDC completion or production readiness.
