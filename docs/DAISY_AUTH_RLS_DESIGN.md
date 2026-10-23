# Daisy first-party auth: RLS and database boundary plan

Status: design/review artifact only. Do not treat this as a migration or authorization pass.

## Current observed rehearsal state

On Neon project `flat-unit-34950816`, branch `br-dark-smoke-b4iu7i2t`, database `neondb`, PostgreSQL 18.6:
- All five `daisy_auth_*` tables exist.
- All five have row-level security disabled and not forced.
- Table owner is `neondb_owner`.
- The observed `solvex_runtime_rehearsal_login` role has `CREATEROLE`, `CREATEDB`, and `BYPASSRLS`; it is not an acceptable application runtime identity.
- `solvex_app_runtime` is NOLOGIN and has no bypass-RLS or role/database creation attributes.
- Inspection was read-only. No roles, grants, policies, tables, or data were changed by this review.

## Why a tenant_id policy alone is not enough

The repository performs unauthenticated account lookup by normalized email, registration that creates tenant/account/token in one transaction, verification/reset token consumption, session creation/revocation, and global rate-limit upserts. A policy that only checks a tenant setting would break pre-authentication operations; a broadly privileged BYPASSRLS login would defeat the isolation objective. Do not solve this by trusting a client-supplied tenant ID or allowing the application to set arbitrary tenant context.

## Required architecture before auth routes are mounted

1. Use a dedicated login-capable auth runtime role with no SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, REPLICATION, or membership in owner/superuser roles. Keep ownership/migration privileges separate from runtime.
2. Revoke default/public access and grant only the exact schema/table/function privileges required. Confirm inherited grants and default privileges as well as direct grants.
3. Put pre-authentication operations behind narrowly scoped database functions with fixed `search_path`, no dynamic SQL, explicit input validation, and least-privilege ownership. Functions must not expose account password hashes or token hashes to callers beyond the trusted server-side auth implementation.
4. For authenticated tenant-scoped operations, establish tenant identity only from a server-validated session, transaction-locally, and prevent callers from choosing or overriding it. Test connection-pool reuse so context cannot leak across requests.
5. Enable and FORCE RLS on tenant-scoped tables only after the function/query design is finalized. Write explicit policies for each operation and test as the actual runtime role, not as `neondb_owner`.
6. Rate-limit table operations must be atomic under concurrent requests. Check that expired windows and blocked windows cannot race or reset a block early.
7. Add live PostgreSQL integration tests on this disposable branch for: registration races/duplicate emails; verification/reset token replay and expiry; session revocation/disabled accounts; cross-tenant reads/writes; runtime-role privilege escalation attempts; missing/forged tenant context; pooled connection context cleanup; rate-limit concurrency; and backup restore.
8. Re-run typecheck, build, lifecycle tests, 120-case corpus, release-safety/payment-disabled checks, and the 46-gate preflight. Production preflight and runtime-wiring steps must execute and pass—not be skipped—before any production activation decision.

## Important repository review findings to test

- `consumePasswordResetToken` marks a token consumed before the password replacement transaction begins. A later failure can invalidate a token without changing the password. Consider making token consumption, password update, and session revocation one atomic repository operation.
- `consumeRateLimit` increments the attempt counter, then sets `blocked_until` in a separate statement. Concurrent requests can observe a transient unblocked state; combine increment/block decision into one atomic SQL statement and test under contention.
- The router's Origin check is useful but is not a complete CSRF strategy by itself. Verify same-site assumptions, trusted proxy configuration, cookie behavior, and CSRF coverage for every cookie-authenticated mutation.
- The Resend adapter exists but is not wired to the router or live-tested. Keep credentials in server-side secret storage; test delivery only with a controlled inbox after sender/domain verification.

## Release boundary

No production migration, authentication activation, login UI wiring, domain change, deployment, or payment configuration is authorized by this document. Keep auth unmounted, readiness blocked, and PayPal/live payments disabled until all evidence is current and complete.
