# First-party authentication boundary — implementation status

## Implemented on this feature branch

`src/auth/FirstPartyAuthService.ts` defines a repository-injected first-party credential/session service with:

- Scrypt password hashing using a unique random salt per account and constant-time comparison.
- Invitation-only registration. The repository must atomically consume a single-use invitation and create the account plus tenant membership; role is fixed to `CUSTOMER` during self-registration.
- Opaque, cryptographically random session tokens. Only SHA-256 token digests are stored by the repository.
- Server-side session expiry and revocation checks.
- Tenant membership re-checks on every session verification; roles are loaded from the repository, not accepted from client input.
- Generic invalid-credential responses, an injected rate-limiter contract, and audit-event hooks.

The service is intentionally not wired to public routes yet. Its constructor requires an explicit repository and rate limiter, and the production implementations do not exist in this branch. This avoids accidentally treating an in-memory adapter as durable security infrastructure.

## Required next implementation

1. Implement a reviewed, transactional repository against the existing canonical Neon schema or a separately reviewed additive migration. The adapter must not use generic `payload_json`, silently fall back to in-memory/SQLite mock storage, or execute migrations on a live database.
2. Implement a shared, atomic rate limiter suitable for the deployment topology.
3. Add integration tests for invitation replay, concurrent registration, password verification, disabled accounts, membership revocation, tenant isolation, session revocation, session expiry, restart readback, and database failure.
4. Add HTTP routes only after the durable repository exists. Set the opaque session token only in an `HttpOnly; Secure; SameSite=Lax` cookie, protect cookie-authenticated mutations with same-origin/CSRF controls, and never return session tokens in JSON for browser clients.
5. Configure the trusted first-party account recovery and invitation-administration process; do not let a registering user select `OWNER` or `ADMIN`.
6. Keep the existing `src/auth/AuthService.ts` production boundary fail-closed until the new service has a reviewed adapter and route-level security tests.
7. Regenerate the authoritative 46-gate evidence on the exact commit after integration. The auth gate must remain blocked while any required proof is absent.

## Verification scope

`scripts/test_first_party_auth.ts` uses explicitly in-memory test doubles to verify service behavior. Passing that suite proves only the tested service contract under those test doubles. It does not prove persistence durability, multi-replica rate limiting, route security, production identity, or production readiness.

No live database was connected or changed. No production credential was added. Authentication and payments remain disabled in the canonical runtime until the complete chain is reviewed and verified.

## Confirmed Neon integration contract (read-only inspection, 2026-10-29)

The Neon production branch was inspected read-only; no secret values or application rows were read.

- Canonical `public.users` is tenant-scoped and has a unique `(tenant_id, email)` constraint. The current schema does not include password salt/hash columns.
- `public.tenant_memberships` has a unique `(tenant_id, user_id)` constraint and a `role_id` foreign key to `public.roles`.
- RLS policies on `users`, `tenants`, `tenant_memberships`, `roles`, and `permissions` use `solvex_private.current_claims()` to require the signed tenant context.
- `solvex_private.current_claims()` expects an HMAC-SHA-256 token formatted as `base64(JSON claims).hex_signature`; claims include `user_id`, `tenant_id`, `email`, `role`, `issued_at`, and `expires_at`. Its maximum lifetime is 15 minutes and it reads `app.auth_token` from PostgreSQL session settings.
- `solvex_private.auth_context_ready()` returned `true`, which proves a sufficiently long database-side secret record exists. It does **not** prove that the application has the matching secret, that signing/verification is correctly wired, or that login works.

`src/auth/TenantContextToken.ts` implements the database's observed token format and validation rules. Its token is an internal database-context token, not a browser session token. The eventual repository must set `app.auth_token` using `SET LOCAL` inside the same transaction as each tenant-scoped query; it must never expose this token to a client. The HMAC secret must be provisioned and compared through a safe validation procedure without logging or displaying it.

The current `FirstPartyAuthService` account lookup is now explicitly tenant-scoped to match the canonical `(tenant_id, email)` key. A transactional adapter must also create the corresponding `users` and `tenant_memberships` rows, reference an already-provisioned least-privilege role, and reject registration if any part cannot commit atomically.

- Read-only role metadata also showed the legacy `solvex_runtime_login` role is a member of `neon_superuser`; it must **not** be used by the application. `solvex_runtime_login_v2` is configured with `NOINHERIT` and is a member of `solvex_app_runtime`. The eventual database adapter must deliberately establish the least-privilege role inside each transaction and verify its effective role/privileges; do not assume membership privileges are inherited automatically.
