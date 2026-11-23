# GIT G.O.A.T.

GIT G.O.A.T. is a GitHub repository inventory and checklist assistant. It pins a scan to a commit, inventories the complete recursive Git tree when GitHub returns it without truncation, attempts bounded text inspection, reports heuristic findings, and provides step-by-step multiple-choice remediation guidance.

> **Security and accuracy boundary:** a complete file-path inventory is not the same as reading every byte, proving that controls work, or running the project. The current app does **not** execute repository code. It has no isolated execution backend, and it fails closed rather than falling back to the web-app host. A positive file-presence result is not operational verification or an enterprise-readiness certification.

## What a scan does

1. Accepts an `https://github.com/owner/repository` URL for a public repository. It resolves the default branch to a commit SHA so the report identifies the scanned revision.
2. Requests the recursive Git tree at that commit. If GitHub marks the tree as truncated, the scan fails instead of claiming a complete inventory. Git blobs (including symbolic-link blobs) are counted as files; directories and submodule entries are not counted as file contents.
3. Inventories all file paths and Git-reported blob sizes from that returned tree. The JSON report and collapsed file-list panel expose each inventoried path, Git-reported size, and `TEXT_INSPECTED`/`NOT_INSPECTED` state. The report also shows aggregate counts and per-file omission reasons.
4. Attempts to fetch small, non-obviously-binary file contents with bounded concurrency. Source files and then common configuration/documentation files are prioritized. Text is checked with deterministic, lightweight heuristics (repository file presence, likely secret patterns, and a JavaScript/TypeScript import approximation).
5. Presents findings and a finding-specific multiple-choice guide. Recording a choice updates the report's local finding/scope state; it does not modify GitHub.

### Content-inspection limits

The current scanner inspects up to 2,000 files, with a 1 MiB per-file limit and a 64 MiB aggregate byte budget. Known binary/media/archive extensions, files over the per-file limit, files with unknown Git blob sizes, files beyond the inspection caps, unreadable files, and non-UTF-8/NUL-containing content are inventoried but not text-inspected. Their paths and reasons are listed in `exclusions`; both the per-file inventory and exclusion details are capped at 10,000 entries, and the report says when either list is truncated. This is bounded text inspection, not byte-for-byte analysis of every binary or every possible file.

The source is pinned to the commit SHA rather than a moving branch. The scan does not download/extract an archive and does not execute or evaluate any repository content. Raw text retrieval is read-only. Public unauthenticated GitHub API limits can prevent a scan from starting; try again later or enable an appropriately scoped GitHub integration before adding private-repository access.

### Execution and test verification

**Sandbox code execution is currently blocked / not configured.** The report returns `executionStatus: BLOCKED`, `executedFiles: 0`, and the reason. The app does not run each file, a test suite, build, package lifecycle script, migration, deployment, or other repository command. No individual source file is launched on the web server.

Do not replace this gate with Node's `vm`, a child process, or the app-host Dockerfile: none alone is an adequate security boundary for hostile repository code. Running code safely requires a separately provisioned, ephemeral isolation service (for example, a hardened container/microVM executor) with enforced no-network/no-secret access, CPU/memory/process/storage quotas, wall-clock timeout, read-only inputs, controlled dependency acquisition, output limits, tenant separation, cleanup, and audit records. It also requires a policy for project-level tests/builds; many files cannot be meaningfully run independently because they need dependencies, fixtures, services, or project context. Until that backend is provisioned and exercised, reports must keep execution as BLOCKED and must not call an inventory or syntax heuristic a passing test.

### Provider fit for a future executor (not configured)

For the stack you use, **Vercel Sandbox is the best-documented candidate to evaluate first** for the execution boundary: Vercel documents per-sandbox Firecracker microVM isolation, resource limits, timeouts, a JavaScript/TypeScript SDK, and network-firewall policies. Outbound network access is available by default, so a production integration would need restrictive policies rather than assuming the default is offline. See the [Vercel Sandbox security model](https://vercel.com/docs/sandbox/concepts/security) and [Sandbox overview](https://vercel.com/docs/sandbox). A future “mini terminal” should be a controlled job console that can invoke approved project-level test/build commands inside disposable sandboxes—not a shell on the app host, and not an attempt to run every source file independently.

Sandbox use is metered and subject to plan quotas. The current [Vercel pricing and quota documentation](https://vercel.com/docs/sandbox/pricing) describes included Hobby usage and metered paid usage. No sandbox was created for this task; before enabling one, confirm the Vercel account’s plan, cost controls, and the exact network policy.

**Neon is not currently integrated.** The app’s optional persistence adapter is MongoDB via server-side `MONGO_URL`; it does not currently connect to Neon. Neon could store scan reports and decisions after a Postgres adapter, schema/migrations, and appropriate report ownership/authentication are implemented. For Vercel Fluid compute, Neon currently recommends a pooled standard Postgres TCP connection; see [Neon’s Vercel connection guidance](https://neon.com/docs/guides/vercel-connection-methods). A database stores report data; it is not a code-execution sandbox.

Fly.io could be evaluated for a separate worker service, but a generic Machine is not automatically a safe execution product. Fly’s [shared-responsibility documentation](https://docs.fly.io/security/shared-responsibility) assigns customers responsibility for the machine image contents, security configuration, and application-layer network controls. Any Fly-based design would still need short-lived isolated jobs, strict network/secret boundaries, quotas, cleanup, and audit records. No Vercel, Neon, or Fly infrastructure has been connected or deployed by this repository change.

## Report and score semantics

The percentage is a **checklist estimate**. It is calculated as `weight(VERIFIED_COMPLETE) / weight(in-scope) × 100`, using Critical=10, High=6, Medium=3, Low=1. The UI displays both the percentage complete and its complement, the percentage left. `BLOCKED`, `NOT RUN`, and remediation-required findings remain in scope; a justified `NOT_REQUIRED` choice leaves the denominator. These estimates are not directly comparable across products with different rules, weights, applicability, or evidence standards.

Repository path presence can establish that a named file or directory exists. It cannot prove the policy is active, tests pass, CI is green, dependencies are safe, branch rules are enforced, or a secret has never been committed. Findings should be reviewed against the cited evidence and repository-specific requirements.

## Guided remediation

Each built-in repository check has a finding-specific multiple-choice question and concrete manual checklist. Unknown/future findings use a generic fallback. Choices require a rationale; “Not in scope right now” requires a substantive rationale. Checklist ticks are local to the page and are not verification. Recording a choice does not edit GitHub, create branches or pull requests, execute code, or guarantee a fix. Review the resulting report and verify changes independently.

## Current capabilities and unavailable features

| Capability | Current status |
|---|---|
| Public GitHub repository, pinned default-branch scan | Implemented; unauthenticated API limits apply |
| Complete Git-tree path/size inventory | Implemented when the recursive Git tree is not truncated |
| Bounded text inspection | Implemented with the limits above; omissions are reported |
| Sandbox execution and per-file test runs | **Blocked; no executor is configured; zero files executed** |
| Private-repository scans / GitHub OAuth | Not implemented/configured |
| GitHub repository writes, repair branches, pull requests | Not implemented; no write path is enabled |
| OSV or other advisory database analysis | Not implemented |
| Branch-protection inspection | Blocked without authorized GitHub repository settings access |
| CI run/status inspection and actual build/test results | Not implemented |
| Comprehensive history-aware secret scanning | Not implemented; present text scan is heuristic and current-commit-only |
| Persistent reports/decisions | Optional MongoDB adapter; unverified until `MONGO_URL` is configured and exercised |
| User accounts, ownership authorization, audit log | Not implemented; do not deploy as a multi-user private-repository service |
| Bit components / `bit use` / `bit run` | Not claimed; the required Bit CLI/platform version was not available for validation |

The Dockerfile packages **this web application**. It is not the executor and does not make repository code safe to run.

## Architecture

- `src/client/` — React/Vite landing page, scan results, coverage indicators, findings, and guided workflow.
- `src/server/scanner.ts` — public GitHub metadata/tree calls and bounded raw text inspection; no shell execution.
- `src/server/index.ts` — Express REST API, request validation, rate limiting, static serving.
- `src/server/store.ts` — optional MongoDB persistence and volatile in-process fallback.
- `src/shared/contracts.ts` — report, status, severity, and rule definitions.
- `src/shared/scoring.ts` — deterministic weighted checklist calculation.
- `src/shared/guidance.ts` — remediation questions, choices, and checklists.
- `src/shared/*.test.ts`, `src/server/scanner.test.ts` — rule/scoring/guidance and scanner-planner tests.
- `public/openapi.json` — API reference.

## Requirements and local development

Tested toolchain target: Node.js 22 and pnpm 11. From the repository root:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Run the API and frontend in separate terminals:

```bash
pnpm api   # Express API on port 3001
pnpm dev   # Vite UI on port 3000; /api is proxied to port 3001
```

Production uses `pnpm build` and `pnpm start`; the app honors `PORT` and serves the built client/API from the configured port. `GET /api/v1/health` reports the live capability gates.

## Configuration and persistence

`MONGO_URL` is the only currently usable optional application setting shown in `.env.example`. It is read by the server only. When present, scans and decisions are written to MongoDB database `git_goat`; without it, records are kept in process memory and disappear when the server restarts. MongoDB persistence has not been verified unless a real configured database has been exercised.

`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET`, `GITHUB_CALLBACK_URL`, and `ALLOWED_ORIGINS` are placeholders only. OAuth, secure login/session handling, and private-repository authorization are not implemented. Do not enter credentials into frontend code or commit a populated `.env` file. Never add tokens, private keys, or repository secrets to a scan request.

## REST API

Base path: `/api/v1`. JSON request bodies are validated. The API applies an IP-based rate limit. It is not authenticated; UUID scan IDs are not an authorization mechanism.

### `GET /health`

Returns service health and capability flags such as public read-only scanning, MongoDB availability, GitHub OAuth configuration, isolated runner availability, and GitHub write availability.

### `POST /scans`

Request:

```json
{ "repository": "https://github.com/owner/repository" }
```

Returns `201` plus a `ScanReport`, including the pinned commit, full-tree file count, coverage metrics, content exclusions, findings, heuristic score, and an explicit blocked execution status. Invalid URLs return `400`; unknown/private repositories return an error; truncated Git trees return `413`; upstream rate limits return `429`.

### `GET /scans/{id}`

Returns the report if it remains in the configured store; otherwise `404`. Volatile records are process-local.

### `POST /scans/{id}/choices`

Request:

```json
{
  "findingId": "R02",
  "choice": "Use an organization-approved license",
  "rationale": "This repository is distributed under the approved organization license."
}
```

Rationale length is 10–1,000 characters. The response returns the updated report. A decision is recorded, not applied to GitHub.

## Container image

The Dockerfile builds/runs the application only. A container image build/start and health check should be verified in the intended deployment platform before relying on them. Do not expose a Docker socket or mount repository execution inputs into this web-app container as a shortcut to create an executor.

## Security model

- Initial scan is read-only; requests are constrained to `github.com` repository URLs and GitHub's raw-content host is derived from a fixed origin.
- Repository text is treated as untrusted data, bounded by file/byte/concurrency limits, and never evaluated.
- No GitHub OAuth, private-repo token storage, repository write, repair, PR, or code execution capability is enabled.
- The API does not authenticate users or enforce per-user report ownership. Until that is implemented, do not use the service for sensitive private repositories or expose it as a multi-tenant scanner.
- File-presence and secret-pattern heuristics can be false positive/negative. Use provider-native controls and independent security review for actual assurance.

## Verification record

The latest automated checks should be run against the exact commit intended for release. A passing TypeScript check, unit tests, or web-app build only verifies this application; it does **not** verify a repository submitted to the scanner. Check `BUILD_REPORT.md` for the latest task-specific evidence and limitations, and update it whenever code behavior changes.
