# First-party authentication — staging checklist

**Status on main:** foundation code present; production login remains **disabled**.

`AuthService.ts` continues to reject local token minting. HTTP routes are only available when `AUTH_ENABLED=true` **and** durable Neon + email + origin configuration succeed.

## What is included

| Module | Role |
| --- | --- |
| `src/auth/FirstPartyAuth.ts` | scrypt password hashing, sessions, rate limits, verification, reset |
| `src/auth/NeonFirstPartyAuthRepository.ts` | typed Neon repository (no generic `payload_json`) |
| `src/auth/FirstPartyAuthRouter.ts` | Express routes; Secure HttpOnly cookie; origin checks |
| `src/auth/DaisyAuthEmailDelivery.ts` | Resend HTTPS delivery; fail-closed |
| `src/auth/createFirstPartyAuth.ts` | Opt-in factory gated by `AUTH_ENABLED` |
| `migrations/005_daisy_first_party_auth.sql` | Additive schema only — **not** auto-applied |

## Before enabling on any environment

1. Apply `005` on a **disposable Neon branch** only; never on production first.
2. Verify least-privilege runtime role (no BYPASSRLS, no superuser).
3. Add RLS / FORCE RLS policies for tenant isolation on auth tables and domain tables.
4. Set secrets in a secret manager (never commit):
   - `NEON_DATABASE_URL` or `DATABASE_URL`
   - `AUTH_RATE_LIMIT_PEPPER` (≥32 random bytes)
   - `AUTH_PUBLIC_ORIGIN` (scheme + host only, HTTPS)
   - `AUTH_EMAIL_API_KEY`, `AUTH_EMAIL_FROM`
5. Integration tests on the disposable branch:
   - register → verify email → login → `/me` → logout
   - expired / revoked session rejected
   - password reset revokes all sessions
   - rate limit lockout
   - cross-tenant session rejection
   - unknown-email responses do not enumerate accounts
6. Only then set `AUTH_ENABLED=true` on that staging deployment.
7. Keep production `AUTH_ENABLED` unset/false until staging evidence is recorded and reviewed.

## Explicit non-goals of this PR

- Does not mount auth routes by default
- Does not apply Neon migrations
- Does not enable payments
- Does not claim production readiness
- Does not replace original archive UI modules

## Typed domain persistence (next)

Generic Neon writes remain blocked in `NeonPersistence.ts`. Domain repositories for problems, offers, orders, audit, etc. must map real columns (see `DatabaseSchema.ts` entities) with tenant filters, transactions, and idempotency — still pending.
