# GIT G.O.A.T. — Implementation Plan

## Product direction
A reusable repository-readiness and completion assistant. The user begins with a minimal, image-led page, submits an authorized GitHub repository URL, reviews an evidence-backed scan, and follows an approval-controlled, step-by-step multiple-choice guide to improve readiness. Scanning is strictly read-only. Repository changes must require explicit authorization and be proposed on a separate branch/PR; running repository code requires explicit approval and a genuinely isolated runner.

## Implementation approach
- Build a responsive React + TypeScript frontend and a versioned Node REST service in the initialized Webdev project. Keep browser routes relative and service endpoints authenticated/validated where credentials exist.
- Deliver a real initial scan path for public GitHub repositories: validate repository URLs, resolve a commit, retrieve a bounded archive without executing its contents, inventory files and exclusions, and run deterministic, evidence-backed readiness/security checks. Reject archives above 200 MB. Preserve commit identity and scan evidence.
- Persist report/workflow records using MongoDB only when `MONGO_URL` is provided; do not silently substitute another database. Until then, persistence-dependent features are explicitly unavailable rather than represented by fake durable states.
- Model findings, approvals, guided work, changes, tests and verification as explicit persisted states. Expose readiness status bars, severity summaries, evidence, next steps, tips and multiple-choice choices from service-backed data.
- Implement GitHub OAuth and PR/write paths only after an OAuth application is configured. Use least privilege, incremental scopes, server-side credentials, CSRF protection, encrypted tokens and explicit confirmation before branch creation. No automatic merge.
- Keep sandbox execution disabled until an isolated runner enforcing network, resource and credential constraints is configured and proven. Never treat ordinary application hosting or Docker alone as proof of secure isolation.
- Validate Bit packaging against available toolchain; the current environment does not expose a `bit` executable, so do not claim Bit commands work unless installed and tested.

## Project structure
- `src/client/`: React page, repository submission, report/status views, guided multiple-choice flow.
- `src/server/`: HTTP service, validation, GitHub archive client, scan orchestration and capability gates.
- `src/shared/`: API contracts, status/severity definitions, scoring and deterministic rule definitions.
- `src/server/persistence/`: Mongo repository adapters and schema/index setup, disabled with an explicit configuration error when no `MONGO_URL` exists.
- `tests/`: unit, API and integration coverage for URL validation, read-only scanning, scoring, approval gates and status transitions.
- `public/`: route manifest and supplied background artwork.

## Design
Three alternatives: terminal observatory (0.06), editorial security brief (0.04), industrial command console (0.03). Chosen: **terminal observatory**.
- Design movement: cinematic observability console, blending the supplied G.O.A.T. brand artwork with an understated engineering interface.
- Core principles: one primary action; evidence before scores; clear human control; progressive disclosure.
- Color philosophy: preserve the image's black/amber/gold identity, with neutral high-contrast surfaces and restrained green/blue status accents; severity colors are consistent and never color-only.
- Layout paradigm: full-bleed branded entry page with a compact search panel, transitioning to a focused scan workspace with a vertical guided-work rail and uncluttered report panels.
- Signature elements: fine amber scan-line dividers; compact evidence chips linking each result to its source; segmented readiness bars with text labels.
- Interaction philosophy: no hidden mutations; each action explains its effect and next approval boundary.
- Animation: brief progress shimmer and panel transitions only; respect reduced-motion preferences and avoid implying work occurred when it has not.
- Typography: sturdy sans for interface labels and readable monospace for commit hashes, file paths and evidence excerpts.
- Brand essence: repository analysis and guided completion for teams that need an honest, auditable path from source to enterprise readiness; precise, empowering, accountable.
- Brand voice: direct, evidence-led, calm. Examples: “Start with a repository URL.” “Every score links to evidence—and every change waits for your approval.”
- Wordmark & logo: retain the distinctive user-supplied G.O.A.T. artwork as the brand mark/background; do not recreate its text in a default typeface.
- Signature brand color: warm amber/gold from the supplied artwork.

## Q&A-approved change workflow
- Keep repository scanning read-only. The user selects a finding, answers its guided questions, and the app records the answers as authorization for that specific proposed remediation; do not treat answers as broad permission for unrelated edits.
- Generate a patch in a temporary workspace, run applicable checks in a Vercel Sandbox isolated microVM, capture logs and a diff, then push only that remediation to a dedicated `goat/repair-*` branch and create or update a pull request. Never merge or deploy automatically. A failed or unavailable check blocks automatic PR creation and is reported accurately.
- Do not pass GitHub tokens, application secrets, or production credentials into the code-execution sandbox. Restrict outbound network access to the minimum needed for source/dependency retrieval; cap duration/resources and clean up workspaces after retaining redacted evidence.
- Add a visible **Connectors** control that lets a user choose and configure GitHub, Vercel Sandbox, and Neon independently. Show connection/permission status and ask for protected credentials only when the selected feature needs them. Do not create provider resources or incur usage charges without a separate user confirmation.
- Use Neon Postgres for durable workflow, approval, job, PR, and audit state when configured; keep public read-only scans usable without connector setup. Do not silently fall back to process-local storage for actions that require durable authorization or job state.
- Use a GitHub App with minimum repository permissions for metadata/content branch operations and pull-request creation; scope installation access to selected repositories. OAuth/App credentials remain server-side and are collected through protected project setup.

## Material constraints
The connector chooser is a product capability; it does not imply the provider accounts are already connected. GitHub App credentials, Neon connection string, and Vercel Sandbox authorization must be configured and verified before live write/execution features are enabled. Until then those capabilities remain explicitly unavailable. No repository code will run during scanning; changes are limited to Q&A-authorized remediations on branches/PRs, with no automatic merge or deployment.
