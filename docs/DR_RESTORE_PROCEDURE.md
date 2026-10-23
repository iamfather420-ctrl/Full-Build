# Disaster Recovery Restore Procedure

This procedure uses the daily backup artifacts produced by `.github/workflows/daily-backup.yml`. Run the rehearsal only in a disposable/scratch Neon branch and a staging deployment. Never restore over production as part of this test.

## Artifacts
- Code: `solvex-code-backup-<run_id>` (tar.gz).
- Database: `solvex-neon-backup-<run_id>` (custom-format PostgreSQL `.dump`, previously verified with `pg_restore --list`).
- Record the workflow run ID, artifact age, source commit, database schema/version, and checksum where available. Artifact listing alone does not prove recoverability.

## Restore database (scratch Neon branch)
1. Select the latest successful, retained database backup and matching code backup; record run IDs and checksums.
2. Create a disposable Neon branch with sufficient capacity. If branch creation is unavailable or the branch limit is reached, stop and report BLOCKED rather than restoring to production.
3. Download the database artifact and verify it is readable with `pg_restore --list`.
4. Restore into the scratch database:
   ```bash
   pg_restore --dbname="$SCRATCH_NEON_URL" --no-owner --no-acl --clean --if-exists neon-dump-YYYY-MM-DD.dump
   ```
   Use a fresh empty scratch database if the selected flags are incompatible with the dump or target; document any deviation before proceeding.
5. Run `scripts/neon-gate11-readonly-audit.sql` against the restored branch. Confirm restricted role flags, memberships, RLS/forced-RLS, and policies. Record any schema or role recreation requirements.
6. Run all cases in `docs/ISOLATION_TEST_PLAN.md` with synthetic tenants and the actual verifier implementation.
7. Deploy the matching code to staging against the restored branch. Check health/readiness endpoints, application startup, expected core reads/writes, logs, and tenant isolation.
8. Confirm that secrets/configuration are re-provisioned through the secret manager; do not store credentials in backup artifacts or test evidence.

## Identity and privacy checks
- Verify that restore preserves required account-to-tenant references, revocation/recovery metadata, and audit provenance.
- If AGATE/on-chain identifiers are used, verify that the application does not depend on putting direct PII on-chain and that off-chain PII deletion behavior is documented and testable.
- Never claim an immutable public-chain record was erased. Record which off-chain records were deleted and which non-PII commitments remain.
- Keep login and payment activation disabled throughout the rehearsal.

## Evidence
Record restore logs, backup/run identifiers and checksums, scratch branch ID, database/schema version, post-restore audit JSON, isolation-test transcript, staging health/readiness responses, and any deviations. Link every artifact to the exact source commit and rehearsal timestamp.

## Gate
Disaster recovery is not verified until an actual scratch restore, post-restore security/isolation checks, and staging validation have completed successfully and evidence is recorded. Backup existence or `pg_restore --list` alone is insufficient.
