# Daisy first-party authentication foundation

## Decision

Daisy is the intended first-party identity and session authority. OIDC is not required for the password-based core in `src/auth/FirstPartyAuth.ts`. This is a staged implementation, not a declaration that production authentication is enabled or ready.

## Implemented in this branch

- Password hashing with Node.js scrypt, a random salt, explicit work factors, and constant-time comparison.
- Email verification and password-reset tokens are random, short-lived, single-use by repository contract, and stored only as SHA-256 hashes.
- Opaque, random session credentials; only token hashes are stored. Sessions expire after 12 hours and support revocation.
- Email normalization, minimum 12-character passwords, generic login/reset responses, and rate-limit hooks.
- The caller cannot choose tenant IDs or roles during registration. Public registration must always assign `CUSTOMER`; privileged roles require a separately audited owner-controlled provisioning workflow.
- A PostgreSQL/Neon repository implementation using parameterized SQL and transactions is included. An email-delivery adapter is still mandatory. No process-memory production fallback exists.
- An opt-in Express router provides registration, verification, login, session inspection, logout, and password-reset endpoints. It is deliberately not mounted in the existing API.
- Additive proposed schema in `migrations/005_daisy_first_party_auth.sql`; it is deliberately not applied.

## Required before integration or production

1. Reconcile and apply the proposed auth schema only on a disposable Neon branch, after checking naming collisions and grants. The included repository targets this schema; it is not verified against the existing 27-table production schema. Test transaction semantics against real PostgreSQL.
2. Add the mail delivery adapter with verified sender/domain, delivery monitoring, abuse controls, and safe link construction.
3. Add HTTP routes with strict request schemas, bounded body sizes, CSRF protection for cookie-authenticated mutations, origin checks, HTTPS, `Secure; HttpOnly; SameSite=Lax` cookies, and cookie clearing on logout. Do not return session tokens in JSON.
4. Use a shared durable rate limiter keyed by hashed account/source identifiers. The current interface uses email as the source key; the HTTP adapter must pass a separately derived client/network key without trusting arbitrary forwarding headers.
5. Establish tenant isolation in the database using the signed server-side session identity and transaction-scoped tenant context. Do not trust a client-supplied tenant ID. Reconcile with existing tenant tables and FORCE RLS before migrations.
6. Add integration tests against a disposable PostgreSQL/Neon branch: registration race, duplicate email, verification replay/expiry, login, session expiry/revocation, reset replay/expiry, all-session invalidation, disabled account, tenant-crossing attempts, rate-limit concurrency, CSRF, cookie flags, and restore rehearsal.
7. Keep public API mutations disabled and `/readyz` blocked until these gates and the full 46-gate suite pass. The current draft has not been executed by CI in this session; the test command is `npm run verify:first-party-auth`.

## Explicit safety boundary

This branch does not wire the new core into the live API, does not apply a database migration, does not enable login, does not create a privileged account, and does not change deployment or payment configuration. Existing fail-closed `AuthService` behavior remains in place until the durable adapter and integration tests are verified.

## Repository files

- `src/auth/FirstPartyAuth.ts` — credential, verification, session, and reset lifecycle.
- `src/auth/NeonFirstPartyAuthRepository.ts` — PostgreSQL adapter.
- `src/auth/FirstPartyAuthRouter.ts` — opt-in Express endpoints with Origin checks and secure session cookies.
- `migrations/005_daisy_first_party_auth.sql` — proposed additive schema, not applied.
- `scripts/first_party_auth.test.ts` — lifecycle unit tests using a test-only in-memory repository; these do not substitute for database integration tests.


## Database rehearsal evidence (2026-10-23)

- Applied the additive `005_daisy_first_party_auth.sql` table/index shape only to the existing non-primary Neon branch `solvex-tenant-auth-rehearsal-2026-10-16` (`br-dark-smoke-b4iu7i2t`) in project `SolveX`.
- Confirmed all five `daisy_auth_*` tables are present.
- Ran a SQL contract probe for tenant/account/session/token/rate-limit inserts and one-time token consumption. The probe cleaned up its test rows; no test account or session was retained.
- **Not applied to the production branch.** This rehearsal did not validate the TypeScript repository against a live app connection.
- The new auth tables currently have RLS disabled and no policies. Therefore this branch is a schema-shape rehearsal only, not an authorization-isolation pass. Do not mount auth routes or use the schema for real users until a dedicated least-privilege auth DB role, explicit grants, tenant RLS strategy, and concurrency/integration tests are verified.


## Verification update (2026-10-23)

- GitHub Actions run `39909417451` (Build and Enterprise CI) completed successfully on the prior docs commit: locked dependency install, fail-closed release-safety checks, payments-disabled checks, build, TypeScript, and enterprise invariants all passed.
- GitHub Actions run `39909417458` (formal evidence) completed successfully: deterministic corpus roots/receipts, typecheck, app build, enterprise invariants, and original 120-case verifier passed.
- GitHub Actions run `39909417534` (authoritative 120-case verification) completed successfully: release-safety, first-party auth lifecycle tests, payments-disabled checks, typecheck, 120-case corpus, and evidence artifact checks passed. Production preflight and production runtime wiring checks were **skipped**, not passed.
- Follow-up commit `28e7aca7888b479e313ac014c668019885d98300` tightens the Neon session lookup to require a matching account/session tenant, a live session, and a verified, enabled account in the same query. This follow-up commit still requires fresh CI confirmation.
- Live inspection of the non-primary rehearsal branch confirms all five auth tables exist, but RLS is disabled and no auth-specific isolation policy has been proven. Do not mount the router or promote the schema. RLS must be designed around the unauthenticated email lookup and token workflows; a simplistic `tenant_id = current_setting(...)` policy would break login/registration or encourage unsafe bypasses.
- No production auth, production migration, deployment, domain change, or payment configuration was changed.
