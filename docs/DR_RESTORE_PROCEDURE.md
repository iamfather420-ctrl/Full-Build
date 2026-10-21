# Disaster Recovery Restore Procedure

Uses the daily backup artifacts produced by `.github/workflows/daily-backup.yml`.

## Artifacts
- Code: `solvex-code-backup-<run_id>` (tar.gz)
- Database: `solvex-neon-backup-<run_id>` (custom-format `.dump`, verified with `pg_restore --list`)

## Restore database (scratch Neon branch)
1. Download the latest Neon dump artifact from the successful Daily Backup run.
2. Create a disposable Neon branch (do not restore over production).
3. Restore:
   ```bash
   pg_restore --dbname="$SCRATCH_NEON_URL" --no-owner --no-acl --clean --if-exists neon-dump-YYYY-MM-DD.dump
   ```
4. Re-run `scripts/neon-gate11-readonly-audit.sql` against the restored branch.
5. Run the isolation test plan (`docs/ISOLATION_TEST_PLAN.md`).

## Restore code
1. Download the matching code archive.
2. Extract and deploy to a staging target that points at the restored database.
3. Confirm health/readiness endpoints and that tenant isolation still holds.

## Evidence
- Restore command output
- Post-restore audit JSON
- Isolation test transcript
- Staging health-check response

## Gate
DR is not complete until a restore + isolation re-verification has been executed and recorded. Backup existence alone is insufficient.
