# Isolation findings (2026-10-21)

## Confirmed
- Production read-only audit: `solvex_runtime_login` remains elevated (`BYPASSRLS`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, inherits `neon_superuser`).
- On at least one non-production branch, `solvex_runtime_login_v2` exists with `rolbypassrls = false` and membership only in `solvex_app_runtime`.
- `neondb_owner` cannot `SET ROLE` or `GRANT` that role (Neon permission restriction).

## Not yet proven
- Cross-tenant reads return zero under a least-privilege login session.
- Cross-tenant writes are rejected by RLS under that session.
- Auth context ready (`solvex_private.auth_context_ready()` was false on the production audit).
- Restore rehearsal on a scratch branch followed by re-isolation.

## Required next action
Connect a SQL session **as** `solvex_runtime_login_v2` or `solvex_iso_test` (not as `neondb_owner`) and run `scripts/neon-isolation-test.sql`. Record the full output.

Production login remains disabled. GATE-11 remains BLOCKED.
