# Isolation findings (2026-10-21)

## Confirmed
- Production read-only audit: `solvex_runtime_login` remains elevated (`BYPASSRLS`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, inherits `neon_superuser`).
- On non-production branch `solvex-runtime-role-validation-2026-10-19` (branch ID `br-raspy-mountain-b4d774eg`):
  - Least-privilege role `solvex_iso_test` created with membership only in `solvex_app_runtime`.
  - Isolation test executed as `solvex_iso_test` (not `neondb_owner`).

## Isolation test transcript (2026-10-21)
Session confirmation:
```json
{"current_user": "solvex_iso_test", "rolbypassrls": false}
```

Reads:
```json
{"users_visible": "0"}
{"orders_visible": "0"}
```

Unauthorized insert:
```text
NeonDbError: new row violates row-level security policy for table "users"
```

Verdict: **PASS** for no-claim fail-closed behavior under a least-privilege role.

## Still required before GATE-11 can be considered
- Provision signing secret on the validation branch (`auth_context_ready()` must return true).
- Tenant-A vs tenant-B read/write tests with valid signed claims.
- Restore rehearsal on a non-production target followed by re-isolation.
- Application still uses the elevated production login; production login remains disabled.

Production was not touched.
