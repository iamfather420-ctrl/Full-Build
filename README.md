# Full-Build

SolveX + Daisy Haminja full build: the web runtime, formal SAT-witness corpus, payments-disabled release gates, and the source archives used to reconcile it.

This repository is the working tree. The Daisy ISO was split into numbered parts because the files were too large for direct transfer; Smash was used as the transfer service. Do not interpret a single Smash ZIP containing only part-00 as evidence that part-01 is missing from the original build or its release assets.

## Source archives and split build

| Source | Contents | Notes |
| --- | --- | --- |
| [TADA.zip transfer](https://fromsmash.com/MzTZDszljz-ft) | Reported 756 MB ZIP with 63 files | Full-Build snapshots, including `Full-Build-SAT-Witness-Fix-production-hardening.zip`, plus related SolveX / UAREFAKE / Daisy bundles |
| [Smash transfer for the split archive](https://fromsmash.com/YBKjTiquq2-ft) | Reported 1.65 GB ZIP containing `Daisy-AI-OS-Complete-With-ISO.tar.part-00` | One transfer/archive package is not necessarily the complete multi-part source set |
| [Full-Build GitHub release](https://github.com/iamfather420-ctrl/Full-Build/releases/tag/v0.1.0-daisy-ai-os) | Recorded release assets: `Daisy-AI-OS-Complete-With-ISO.tar.part-00`, `Daisy-AI-OS-Complete-With-ISO.tar.part-01`, and SHA-256 file | The repository's recorded source identifies both split parts and the checksum. Use the release asset list as the authoritative location; do not label part-01 missing solely because a Smash package contained part-00 only. |

Archive provenance notes: [sources/smash-archive-manifest.txt](sources/smash-archive-manifest.txt).

## Multi-part archive handling

The split source consists of **part-00 and part-01**. They were split because of transfer-size limits. A transfer archive containing only one part is not the same thing as the original source set being incomplete. To verify a local reconstruction, concatenate the exact parts in numeric order, then check the resulting archive against the published SHA-256 before extracting it. This README does not claim that a new local concatenation or extraction was performed during this documentation correction.

## What landed from the hardening archive

`Full-Build-SAT-Witness-Fix-production-hardening.zip` (reported inside TADA.zip) was merged into this tree on 2026-10-21.

Brought in:

- SAT-witness migration for the 120-case corpus (88 DFRL + 32 DH). Expected solver result is `sat` with an independently checked model, not an UNSAT refutation of the unrestricted paradox. See [SAT_WITNESS_MIGRATION.md](SAT_WITNESS_MIGRATION.md) and [SAT_WITNESS_NATIVE_RECHECK.md](SAT_WITNESS_NATIVE_RECHECK.md).
- Production-hardening pass: public role-minting login retired, OIDC authorization-code + PKCE path, payments fail closed (HTTP 410), additive `migrations/004_access_requests.sql` (not applied to the live database). See [PRODUCTION_READINESS_STATUS.md](PRODUCTION_READINESS_STATUS.md) and [docs/deployment/PRODUCTION_RELEASE_CHECKLIST.md](docs/deployment/PRODUCTION_RELEASE_CHECKLIST.md).

Kept from later commits already on `main` (2026-10-11 through 2026-10-21), which the October 10 archive does not contain:

- Agent, lifecycle, and MMTAI routes and the dashboard shell that links them
- Formal-evidence hash check (`npm run test:formal-hash`) and CI receipt closure script
- Neon `DATABASE_URL` alias, optional PayPal preflight, and the narrowed root `tsconfig.json`
- Backup, read-only audit, and non-production GATE-11 workflows

Release verdict is unchanged: **not production-ready**. `/readyz` is fail-closed until OIDC, schema reconciliation, and the 46 production gates have evidence. PayPal stays disabled.

## Scripts

```bash
bun install --frozen-lockfile   # preferred; package-lock.json is not the source of truth
bun run lint
bun run verify:release-safety
bun run verify:api-security
bun run verify:auth-contract
bun run verify:120
bun run verify:proof-closure
bun run dev                      # local server, see server.ts
```

`npm run verify:all` chains the authoritative verifier, the 120-case aggregation, proof closure, and the release-safety checks.

Do not hand-edit generated evidence JSON to force a SAT result. Regenerate it with the verifier scripts.

## Layout

- `src/` — React UI, API router, Z3 formal verifiers, auth
- `server.ts` — local runtime
- `scripts/` — verification and release-safety checks
- `migrations/004_access_requests.sql` — additive, unapplied
- `app/` — Android shell
- `sources/` — archive provenance manifest
