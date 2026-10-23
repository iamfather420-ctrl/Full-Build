# Daisy auth database boundary — implementation contract

Status: engineering specification only. No function is granted or deployed by this document.

## Decision
The current `NeonFirstPartyAuthRepository` issues direct SELECT/INSERT/UPDATE/DELETE statements against five auth tables. RLS with zero policies correctly blocks that access, but simply adding `tenant_id = current_setting(...)` policies would be unsafe: unauthenticated flows need global email/token lookup, and a caller-controlled session setting is not proof of identity.

Before changing the adapter, introduce a separate database-operation interface whose methods correspond to explicit authentication operations. Do not expose arbitrary SQL, generic CRUD, or caller-selected tenant access.

## Required database operations
- `auth_register(email, password_hash, verification_token_hash, token_expiry, now)`: atomically create tenant/account/token; return a generic outcome that does not reveal duplicate account existence.
- `auth_find_account_for_login(email)`: only return the minimal credential-check record needed by the login flow; apply equivalent scrypt work for unknown accounts and rate-limit before expensive work.
- `auth_consume_rate_limit(key_hash, now)`: atomic upsert and lockout result.
- `auth_consume_verification_token(token_hash, now)`: single-use, expiry-checked atomic consume and verification update.
- `auth_replace_verification_token(account_id, ...)`: permit only an eligible unverified account and consume prior active verification tokens.
- `auth_create_session(account_id, tenant_id, token_hash, ...)`: create only for a verified, enabled account with matching tenant.
- `auth_find_session(token_hash, now)`: join session/account, require tenant binding, not revoked, not expired, account enabled and verified.
- `auth_revoke_session(token_hash, now)` and `auth_revoke_all_sessions(account_id, now)`: revoke by server-provided session/account binding; never accept a client-selected account for an authenticated request.
- `auth_consume_reset_token(token_hash, new_password_hash, now)`: atomically consume valid reset token, update password, revoke sessions and invalidate other reset tokens.
- `auth_create_reset_token(email, token_hash, expiry, now)`: generic external response; internally only issue for eligible account.
- `auth_replace_password(account_id, new_password_hash, now)`: require an authenticated server-side account binding and revoke active sessions.

## Function hardening requirements
1. All functions use schema-qualified table names and a fixed safe `search_path` such as `pg_catalog, public`; no dynamic SQL.
2. Functions are owned by a dedicated `NOLOGIN`, `NOBYPASSRLS` role that is not the table owner and has only the minimum table privileges needed.
3. Revoke function execution from `PUBLIC`; grant only the exact operation functions to a dedicated application role.
4. Keep application login role free of superuser, bypass-RLS, create-role/database, replication, and inherited privileged memberships.
5. Treat unauthenticated bootstrap functions as narrow, audited exceptions. Do not accept tenant ID or account ID as proof of authorization.
6. Verify behavior with two tenants and two accounts: cross-tenant reads/writes fail; wrong tenant session fails; expired/replayed tokens fail; password reset revokes all sessions; duplicate registration is non-enumerating; concurrency cannot consume a token twice.

## Acceptance evidence
- Apply only to a disposable Neon branch after migration review.
- Connect using the exact non-owner, non-BYPASSRLS LOGIN role intended for runtime.
- Record role memberships, grants, RLS flags, policies, function owner/config/EXECUTE grants.
- Run real Postgres integration tests (not only the in-memory `TestRepository` tests).
- Confirm no route mount, production auth enablement, or payment change occurs as part of this work.

## Why this is not implemented as a speculative SQL patch
Operation return types must exactly match `FirstPartyAuthRepository`, especially the `created` registration outcome, account credential lookup, and atomic reset/session invalidation. A half-written set of SECURITY DEFINER functions could create an authentication bypass. Implement and test the database-operation interface and function set together; do not grant broad table access as a shortcut.