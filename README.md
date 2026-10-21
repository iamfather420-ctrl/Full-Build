# Full-Build

SolveX + Daisy Haminja full build: the web runtime, formal SAT-witness corpus, payments-disabled release gates, and the source archives those gates were cut from.

This repository is the working tree. The two Smash transfers below are the uploaded archives it was reconciled against. They expire, so the git history is the durable copy.

## Source archives

| Transfer | Archive | What it is |
| --- | --- | --- |
| [3 x 2 ?](https://fromsmash.com/MzTZDszljz-ft) | `TADA.zip` (756 MB, 63 files) | Full-Build snapshots, including `Full-Build-SAT-Witness-Fix-production-hardening.zip`, plus related SolveX / UAREFAKE / Daisy bundles |
| [1 x 2](https://fromsmash.com/YBKjTiquq2-ft) | `2 x 2.zip` (1.65 GB, 1 file) | `Daisy-AI-OS-Complete-With-ISO.tar.part-00` only |

File-by-file listing: [sources/smash-archive-manifest.txt](sources/smash-archive-manifest.txt).

`2 x 2.zip` is split-tar part 00 by itself. Later parts were not in that transfer, so the Daisy ISO archive cannot be fully unpacked from the link.

## What landed from the hardening archive

`Full-Build-SAT-Witness-Fix-production-hardening.zip` (inside TADA.zip) was merged into this tree on 2026-10-21.

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
- `sources/` — Smash archive manifest
