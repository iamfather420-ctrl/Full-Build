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
