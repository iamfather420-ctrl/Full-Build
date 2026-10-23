# Daisy first-party authentication foundation

## Decision

Daisy is the intended first-party identity and session authority. OIDC is not required for the password-based core in `src/auth/FirstPartyAuth.ts`. This is a staged implementation, not a declaration that production authentication is enabled or ready.

## Implemented in this branch

- Password hashing with Node.js scrypt, a random salt, explicit work factors, and constant-time comparison.
- Email verification and password-reset tokens are random, short-lived, single-use by repository contract, and stored only as SHA-256 hashes.
- Opaque, random session credentials; only token hashes are stored. Sessions expire after 12 hours and support revocation.
- Email normalization, minimum 12-character passwords, generic login/reset responses, and rate-limit hooks.
- The caller cannot choose tenant IDs or roles during registration. Public registration must always assign `CUSTOMER`; privileged roles require a separately audited owner-controlled provisioning workflow.
- An injected durable repository and email-delivery adapter are mandatory. No process-memory production fallback exists.
- Additive proposed schema in `migrations/005_daisy_first_party_auth.sql`; it is deliberately not applied.

## Required before integration or production

1. Implement `FirstPartyAuthRepository` against the reconciled Neon schema using parameterized queries and transactions. Registration, one-time token consumption, reset+session revocation, and rate-limit increments must be atomic.
2. Add the mail delivery adapter with verified sender/domain, delivery monitoring, abuse controls, and safe link construction.
3. Add HTTP routes with strict request schemas, bounded body sizes, CSRF protection for cookie-authenticated mutations, origin checks, HTTPS, `Secure; HttpOnly; SameSite=Lax` cookies, and cookie clearing on logout. Do not return session tokens in JSON.
4. Use a shared durable rate limiter keyed by hashed account/source identifiers. The current interface uses email as the source key; the HTTP adapter must pass a separately derived client/network key without trusting arbitrary forwarding headers.
5. Establish tenant isolation in the database using the signed server-side session identity and transaction-scoped tenant context. Do not trust a client-supplied tenant ID. Reconcile with existing tenant tables and FORCE RLS before migrations.
6. Add integration tests against a disposable PostgreSQL/Neon branch: registration race, duplicate email, verification replay/expiry, login, session expiry/revocation, reset replay/expiry, all-session invalidation, disabled account, tenant-crossing attempts, rate-limit concurrency, CSRF, cookie flags, and restore rehearsal.
7. Keep public API mutations disabled and `/readyz` blocked until these gates and the full 46-gate suite pass.

## Explicit safety boundary

This branch does not wire the new core into the live API, does not apply a database migration, does not enable login, does not create a privileged account, and does not change deployment or payment configuration. Existing fail-closed `AuthService` behavior remains in place until the durable adapter and integration tests are verified.
