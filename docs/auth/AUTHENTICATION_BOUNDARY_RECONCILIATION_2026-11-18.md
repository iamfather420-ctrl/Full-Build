# Authentication boundary reconciliation

**Date:** 2026-11-18  
**Base:** `bbca48a61cc673b0de0a4e48063dad0d60a7a60c`

## Decision

The production application continues to use its existing OIDC authentication path. PR #71 is not merged or copied wholesale because it introduces a second first-party password, invitation, and opaque-session system rather than completing the current OIDC flow.

## Verified current-main behavior

- `artifacts/api-server/src/routes/auth_native.ts` performs the OIDC authorization-code flow with PKCE, requires a verified email from UserInfo, and calls `resolveOidcTenantIdentity(subject, email)` before creating the application session.
- `artifacts/api-server/src/middlewares/authMiddleware.ts` refreshes OIDC sessions, revalidates the signed tenant token, re-resolves membership when needed, and clears the session when verification fails.
- `packages/db/src/index.ts` delegates tenant-claim issuance to `solvex_private.issue_oidc_session_claim` and verifies claims against current users, memberships, tenants, and roles.
- `src/auth/AuthService.ts` explicitly blocks application-side tenant-token minting; the signed token is issued and verified through Neon.

## PR #71 disposition

The branch's first-party password service, password credential tables, invitation flow, session store, rate limiter, Neon adapter, and HTTP router are a separate auth product. Its own branch documentation records unresolved live role-chain, bootstrap, secret-match, recovery, and integration-test requirements. Its router is designed to be opt-in and unmounted.

Do not:
- merge PR #71 as-is;
- mount its router or enable password registration/login;
- apply its migration to canonical production;
- use the legacy privileged Neon runtime login;
- replace or weaken the existing OIDC tenant-claim checks.

## Reconciliation scope

This change keeps the existing OIDC production boundary intact and adds a CI regression guard for its critical source-level invariants. It does not claim to complete a password-authentication product, prove live Neon permissions, or establish production readiness. If first-party password authentication is later required, it must be designed as an explicit, separately approved identity-provider integration with a migration and rollout plan that does not bypass the existing tenant identity and authorization boundary.

## Verification limits

The CI guard checks source-level invariants only. The existing disposable-Neon OIDC lifecycle/RLS integration test remains the live database verification path. Passing this guard alone does not prove production credentials, Neon role provisioning, or live sign-in behavior.
