# GIT G.O.A.T. integration in Full-Build

## Imported source

This directory contains the Git-G.O.A.T. application source copied from
[Solvex-Paradox-Box/Git-G.O.A.T](https://github.com/Solvex-Paradox-Box/Git-G.O.A.T),
default branch `main`, source revision `c762ad38f43d9a920386a9849ff36bc390a5d54f`.

The application is deliberately isolated at `tools/git-goat/`. Its package,
pnpm lockfile, Vite configuration, Express API, React client, scanner,
shared contracts, guidance, tests, OpenAPI document, and project documentation
are kept separate from Full-Build's root package and Daisy/SolveX runtime.
No existing Full-Build source file was replaced.

## Running independently

From this directory, use the commands documented in `README.md`:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

For local development, run `pnpm api` and `pnpm dev` in separate terminals.
The API listens on port 3001; Vite serves the UI on port 3000 and proxies
`/api` to the API. This is a standalone sub-application, not yet mounted
inside Full-Build's main dashboard or production router.

## Source-asset exception

The source repository's `public/goat-background.png` is a 2,735,216-byte
binary image. The available GitHub file-transfer interface returned no
readable/base64 payload for that binary, so it was not fabricated or replaced.
The imported stylesheet still references that original filename; without
the asset the hero falls back to its CSS gradient layers. All text/source
files in the source tree were imported. The image must be transferred from
the source repository as a binary Git object before claiming a byte-for-byte
complete asset import.

## Operational boundaries

This import does not activate GitHub OAuth, private-repository access,
repository writes, pull requests, isolated execution, or production
deployment. The scanner remains read-only and fails closed on a truncated
Git tree. It inventories repository paths and performs bounded text inspection;
it does not execute submitted code or certify readiness.

The source project's `BUILD_REPORT.md` records its own typecheck, test, and
build results. Those checks have not been rerun in this Full-Build checkout
as part of this import. A successful build of the scanner app would not
constitute a test or production-readiness pass for Full-Build.

## Authenticated Registry handoff

The app now exposes an explicit **Record in Autonomous Registry** action after a scan. It does not publish automatically during scanning. The server forwards the signed `x-grok-identity` and original `x-forwarded-host` to the Registry, then performs an independent GET and compares assessment ID, SHA-256 digest, and pinned commit before returning a verified result.

Configure these server-side values before enabling the handoff:

- G.O.A.T.: `SOLVEX_REGISTRY_API_ORIGIN=https://autonomous-registry.vercel.app`
- Autonomous Registry: `SOLVEX_REGISTRY_INGEST_AUDIENCES` with the exact gate JWT audience issued to the authenticated G.O.A.T. app.
- Autonomous Registry: existing `DATABASE_URL` for durable Neon/Postgres storage; without it, preview storage is process-local PGLite and is not durable across restarts.

The Registry requires a signed gate identity with a tenant/team claim. Missing identity, missing configuration, cross-tenant reads, write failures, and readback mismatches fail closed. This adds assessment evidence storage only; it does not grant GitHub write access, execute repository code, create repair PRs, or deploy.
