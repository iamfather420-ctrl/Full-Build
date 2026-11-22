# Changelog

This file records notable repository changes. The initial entry below is a baseline summary from the repository documentation; it is not a complete reconstruction of every historical commit.

## Unreleased

### Added
- Repository documentation for source-archive provenance and split-archive verification.
- Formal-evidence hash verification and proof-closure checks.
- Backup, read-only audit, and non-production gate workflows.
- Fail-closed release-safety and payments-disabled verification.

### Security and release boundaries
- Public role-minting login remains retired; production identity configuration and authorization evidence are required before readiness can be enabled.
- Payments remain disabled by default.
- Production readiness remains blocked until real identity-provider configuration, database schema and tenant-isolation verification, persistence checks, and current production-gate evidence are complete.

### Notes
- This entry summarizes documented repository capabilities and safeguards. Consult the Git history and release notes for exact commit-level chronology.
