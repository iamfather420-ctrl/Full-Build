# Disposable Neon tenant-isolation integration test

This test verifies real PostgreSQL row-level security for the tenant-scoped tables used by the SolveX verification and marketplace flows. It is deliberately not run against production.

## Required setup

1. Create a separate disposable Neon branch from the intended schema. Do not use the production connection string.
2. Create two fixture tenants and at least one fixture row owned by each tenant in every table in the SQL probe: `solutions`, `offers`, `orders`, `proof_bundles`, `proof_evidence`, `verification_runs`, `audit_records`, and `telemetry`.
3. Use a least-privilege application role that is neither a PostgreSQL superuser nor `BYPASSRLS`. The test refuses privileged roles because those roles bypass RLS.
4. Confirm the RLS policies are forced and include tenant ownership in both visibility and write-check expressions. The test recognizes `current_setting(...)` and `auth.jwt()` tenant context patterns; unfamiliar policy designs must be reviewed and tested explicitly rather than silently accepted.
5. Configure GitHub Actions repository secrets:
   - `SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL`: disposable branch URL, not production.
   - `SOLVEX_NEON_TEST_TENANT_A` and `SOLVEX_NEON_TEST_TENANT_B`: distinct existing fixture IDs.

When all three secrets are configured, CI runs `bun run verify:neon-tenant-isolation`. The runner also requires `SOLVEX_NEON_ISOLATION_TEST_CONFIRM=DISPOSABLE_NEON_BRANCH_ONLY`.

## What it verifies

- The required tables exist and expose `tenant_id`.
- RLS is enabled and forced, with at least one policy per table.
- The connected role is not superuser and does not have `BYPASSRLS`.
- Tenant A can read its own fixture rows and cannot see Tenant B rows.
- Tenant B can read its own fixture rows and cannot see Tenant A rows.
- An attempted cross-tenant `UPDATE` is rejected or filtered. The attempt runs inside a PL/pgSQL exception subtransaction and is rolled back.

The test is read-only with respect to committed database state; it does not create, update, delete, or migrate fixtures. It fails if fixtures are absent, a table is missing, policy context is unrecognized, or the role is privileged.

## Limits

This is a disposable-branch integration probe, not proof of all application routes or all write operations. It does not replace typed repository integration tests, migration review, least-privilege grant review, backup/restore tests, or an independent security assessment. The production activation gate must remain BLOCKED until the actual disposable Neon run succeeds and the evidence is reviewed.
