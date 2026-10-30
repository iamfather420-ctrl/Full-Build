# First-party authentication and typed persistence — staging plan

Date: 2026-10-27
Status: DESIGN / NOT IMPLEMENTED
Target: `iamfather420-ctrl/Full-Build`
Safety rule: fail closed. This document does not authorize production changes, credential changes, migrations, account creation, or activation.

## Why this is a plan, not a readiness claim

The current `src/auth/AuthService.ts` intentionally rejects local token issuance and verification because there is no complete, tested identity lifecycle. `src/database/NeonPersistence.ts` deliberately blocks generic migrations and writes because its legacy payload-shaped assumptions do not match the canonical domain schema. Those blocks must remain until their replacements pass the gates below. A connected database or a successful compile is not proof of authentication, persistence, or tenant isolation.

## Workstream A — first-party identity

The target is Daisy/SOLVEX-owned authentication logic, not a hidden external identity-provider dependency. Use well-maintained cryptographic primitives from the runtime/platform; do not invent a password hash, token signature algorithm, random-number generator, or cryptographic protocol.

### Required design boundaries

1. **Credential storage:** store only a password hash produced by a current, memory-hard password-hashing implementation with per-user salt and reviewed parameters. Never store or log plaintext passwords, recovery secrets, session tokens, or password-reset tokens.
2. **Session model:** opaque, high-entropy session tokens; persist only a one-way token digest; enforce server-side expiry, rotation, logout/revocation, and revocation of all sessions after credential reset where appropriate. Cookies must be Secure, HttpOnly, and an intentional SameSite policy; state-changing cookie-authenticated requests need CSRF protection.
3. **Identity lifecycle:** normalized unique account identifier; registration policy; verified recovery channel if email recovery is offered; one-time, expiring, rate-limited recovery tokens; generic public errors that do not reveal whether an account exists. Do not enable email-dependent flows until delivery and domain ownership are configured and tested.
4. **Authorization:** derive user and tenant identity only from a verified server-side session. Never accept caller-supplied `role`, `tenant_id`, `isOwner`, or authorization flags as proof. Check tenant membership and action permissions on every protected operation. Default to deny.
5. **Privileged bootstrap:** no hardcoded owner, default password, static secret, automatic admin promotion, or public first-user-is-admin race. Define a one-time, operator-controlled bootstrap that is disabled after successful use and leaves an audit record.
6. **Abuse resistance:** bounded request sizes, rate limits for sign-in/registration/recovery, constant-time secret comparisons where applicable, input validation, safe logs, and tests for concurrent registration/session revocation.
7. **Separation:** authentication proves who controls a session; it does not itself authorize execution, payments, deployment, or proof-gate activation.

### Authentication acceptance gates

- [ ] Reviewed threat model and explicit account/recovery policy.
- [ ] Dependency and algorithm review; no custom cryptographic construction.
- [ ] Unit tests for correct/wrong password, malformed input, token expiry, tampering, logout, rotation, revocation, recovery-token replay, and concurrent duplicate registration.
- [ ] Integration tests prove anonymous access is denied and tenant A cannot read or mutate tenant B resources even when IDs are guessed or request fields are forged.
- [ ] Cookie, CSRF, rate-limit, and generic-error behavior tested at the HTTP boundary.
- [ ] Secrets are injected at runtime and absent from source, logs, fixtures, and client bundles.
- [ ] First-run bootstrap and account recovery tested in an isolated staging environment.
- [ ] Production enablement remains separately gated until every item is evidenced against the exact release commit.

## Workstream B — typed Neon persistence

Do not create a new generic `payload_json` abstraction or assume the historical list of 27 tables is the canonical schema. Build repositories against the actual schema after recording table/column/constraint/index/RLS metadata from a disposable staging branch or database.

### Required sequence

1. Export a read-only schema inventory from staging: tables, columns, types, nullability, primary/foreign keys, unique constraints, indexes, enum definitions, RLS enabled/forced flags, policies, grants, and migration-ledger contents. Redact secrets and row data.
2. Reconcile the two existing migration ledgers (`_migrations` and `schema_migrations`) before designing any migration runner. Do not guess which ledger is authoritative and do not apply either to production.
3. Define typed repository interfaces for each domain actually used by a live workflow. Each method must specify tenant scope, validated input/output types, transaction boundary, idempotency behavior, and failure semantics.
4. Map those interfaces to existing domain tables and constraints. Use parameterized values; table/column identifiers must come only from fixed, reviewed code. Never spread arbitrary `payload_json` into returned domain objects.
5. Keep the application runtime role least-privileged. Verify that it cannot bypass RLS or access private authentication secrets. RLS policies must bind to trusted session context, not an untrusted request parameter.
6. Add versioned, additive migrations only after schema review, backup/restore validation, and a staging rehearsal. No automatic destructive migration or startup-time schema mutation.
7. Test transactions, rollback on partial failure, duplicate/idempotent requests, concurrent updates, tenant isolation, restart/readback, backup restore, and migration from the actual starting schema.

### Persistence acceptance gates

- [ ] A reviewed schema inventory and migration-ledger reconciliation are committed with sensitive values excluded.
- [ ] Each implemented repository has typed input/output contracts and explicit tenant scope.
- [ ] Tests exercise the actual PostgreSQL schema on disposable staging data, not mocks alone.
- [ ] Cross-tenant reads/writes are denied by application authorization and database RLS.
- [ ] Runtime role cannot bypass RLS or access secret-only schemas.
- [ ] Transaction, retry, idempotency, restart/readback, and backup/restore tests pass.
- [ ] A tested rollback/forward-recovery procedure exists for each migration.
- [ ] No production database mutation occurred during design or staging work.

## Shared release gates

- Authentication and persistence are separate controls; passing one cannot mark the other verified.
- A compile, health endpoint, connection test, or table-count check is insufficient evidence of end-to-end correctness.
- Record test run ID, source commit, schema/migration version, environment classification (local/staging/production), and evidence hashes.
- Evidence must be generated for the exact release commit; stale evidence must not authorize activation.
- Until all required gates pass, report `BLOCKED` / `UNVERIFIED`, keep execution and payments disabled, and do not present illustrative UI data as live provider, account, ledger, or transaction state.

## Immediate next implementation step

Create a **read-only staging schema inventory** and a focused auth threat model before writing database migrations or enabling account creation. Then implement one vertical slice (account/session verification plus one tenant-scoped repository) and test it end-to-end in staging. Expand only after that slice proves the boundaries above.
