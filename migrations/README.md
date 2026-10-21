# Database migration safety

- `004_access_requests.sql` is an **additive** migration for a new `access_requests` table.
- It has **not** been applied to the live Neon database.
- Do not run the full `new-database.sql` bootstrap against the existing 27-table database; it is intended for a fresh database.
- The old generic Neon migration/upsert path is disabled because it assumes a `payload_json` contract that does not match the domain-specific table definitions in the supplied schema.
- Before applying `004_access_requests.sql`, take and test a recoverable backup, compare the live `information_schema` output against the migration, apply it to a staging clone, and run access-request integration tests.
- This migration alone does not complete Neon integration: most current API domain services still use SQLite/DurableStore. Production readiness intentionally remains blocked until those services use the reviewed persistent repository and tenant-isolation tests pass.
