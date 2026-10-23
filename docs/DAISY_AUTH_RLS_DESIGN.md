# Daisy first-party auth: RLS and database boundary plan

Status: design/review artifact only. Not a migration, authorization pass, or production-readiness approval.

## Latest verification (2026-10-23)

- Commit `5dacfcee8c87ee815b308da860c1b3c6667fe94f` adds `scripts/check_daisy_auth_db_gate.sql`, a read-only gate. It checks the five expected auth tables, RLS/ FORCE RLS flags, and basic attributes of the connected role. It intentionally does not change database state.
- CI passed on that commit:
  - Build and Enterprise CI: build, TypeScript, release-safety checks, payments-disabled checks, enterprise invariants.
  - Formal evidence hash stability: deterministic evidence checks, typecheck, build, enterprise invariants, original 120-case verifier.
  - Authoritative 120-Case Verification: lifecycle test, payment-disabled check, typecheck, 120-case corpus, evidence validation and artifacts.
- The authoritative workflow explicitly skipped production preflight and production runtime-wiring verification. Those checks are NOT passed.
- Read-only SQL against rehearsal branch `br-dark-smoke-b4iu7i2t` in project `flat-unit-34950816`, database `neondb`, returned all five expected tables present but **0/5 with RLS enabled and forced**. It ran as `neondb_owner`, whose connected role attributes include `BYPASSRLS`, `CREATEDB`, `CREATEROLE`, and `REPLICATION`. This is not a valid runtime-role test and confirms the gate must remain blocked.
- No roles, grants, policies, tables, or data were changed during this verification.

## Why a tenant_id policy alone is not enough

The repository performs unauthenticated account lookup by normalized email, registration that creates tenant/account/token in one transaction, verification/reset token consumption, session creation/revocation, and global rate-limit upserts. A policy that only checks a tenant setting would break pre-authentication operations; a broadly privileged BYPASSRLS login would defeat the isolation objective. Do not solve this by trusting a client-supplied tenant ID or allowing the application to set arbitrary tenant context.

## Required architecture before auth routes are mounted

1. Use a dedicated login-capable auth runtime role with no SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, REPLICATION, or membership in owner/superuser roles.
2. Revoke default/public access and grant only exact schema/table/function privileges. Audit inherited membership, direct grants, and default privileges.
3. Put pre-authentication operations behind narrowly scoped database functions with fixed `search_path`, no dynamic SQL, explicit input validation, and least-privilege ownership. Do not expose password hashes or token hashes to untrusted clients.
4. For authenticated tenant-scoped operations, derive tenant identity only from a server-validated session, transaction-locally, and prevent callers from choosing or overriding it. Test pooled connection reuse so context cannot leak.
5. Enable and FORCE RLS on tenant-scoped tables only after the function/query design is finalized. Write explicit policies for each operation and test as the actual login-capable runtime role, not as `neondb_owner`.
6. Keep rate-limit operations atomic and test expiry/block boundaries under contention.
7. Add live PostgreSQL integration tests on a disposable branch for registration races/duplicate emails; verification/reset token replay and expiry; session revocation/disabled accounts; cross-tenant reads/writes; privilege escalation attempts; missing/forged tenant context; pooled connection cleanup; rate-limit concurrency; and backup restore.
8. Re-run typecheck, build, lifecycle tests, 120-case corpus, release-safety/payment-disabled checks, and the 46-gate preflight. Production preflight and runtime-wiring steps must execute and pass—not be skipped—before any production activation decision.

## Repository findings: current code versus remaining proof

- The current repository implementation uses a single atomic UPSERT for rate-limit increment/window/block decisions and a transactional `resetPasswordWithToken` operation for token consumption, password update, session revocation, and reset-token invalidation. These address earlier code-level race/atomicity concerns but still require real PostgreSQL contention/replay tests; unit fakes do not prove database isolation.
- The router's Origin check and Secure/HttpOnly/SameSite=Lax cookie are useful defense-in-depth, but there is no complete browser integration evidence for CSRF behavior, trusted proxy/IP assumptions, cookie behavior, or every mutation.
- The Resend email adapter fails closed without server-side credentials and restricts links to the canonical HTTPS origin `https://uarefake.space`. It is not yet wired to an enabled production router or verified by a controlled live delivery. Do not send live email until sender/domain and secrets are confirmed.
- The database gate SQL checks only the connected role's direct attributes and table flags. Passing it alone is necessary but insufficient: inherited role membership, grants/default privileges, function ownership and `search_path`, function EXECUTE grants, actual RLS policies, and cross-tenant behavior must be audited separately.

## Release boundary

No production migration, authentication activation, login UI wiring, domain change, deployment, or payment configuration is authorized by this document. Keep auth unmounted, readiness blocked, and PayPal/live payments disabled until all evidence is current and complete.
