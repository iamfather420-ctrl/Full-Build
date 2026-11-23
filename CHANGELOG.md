# Changelog

Not every historical commit has a corresponding release note. Entries below are limited to repository milestones that are documented in the current repository history and README.

## Unreleased

- Repository governance documentation and scheduled dependency-update configuration are being introduced on a review branch. They are not part of a released build until merged.

## 2026-11-23 — Git-G.O.A.T. scanner integration

- Imported the Git-G.O.A.T. repository scanner under `tools/git-goat/` as an isolated sub-application.
- The integration documentation records that the scanner is not mounted into the main Full-Build dashboard or production router.
- Scanner execution, private-repository OAuth access, durable registry integration, and automated repair/PR creation are not claimed as operational by this entry.

## 2026-10-21 — Production-hardening archive reconciliation

- The repository README records the merge of `Full-Build-SAT-Witness-Fix-production-hardening.zip`.
- The documented hardening included retirement of public role-minting login, an OIDC authorization-code plus PKCE path, payments fail-closed behavior (HTTP 410), and an additive access-request migration.
- The README explicitly states that live OIDC configuration, schema/persistence reconciliation, and production gate evidence still require verification; PayPal remains disabled.

## Release records

The repository README identifies the recorded release `v0.1.0-daisy-ai-os` and its split archive assets. Consult [GitHub Releases](https://github.com/iamfather420-ctrl/Full-Build/releases) for the authoritative release asset list and release metadata.

This changelog does not imply that a release is production-ready or that a documented check was executed by this documentation change.
