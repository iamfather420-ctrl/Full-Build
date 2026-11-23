# Production Readiness

## Current disposition

**Not yet ready for a public multi-user production launch.** This update hardens the service and verifies the production build, but it does not implement user authentication, private-repository authorization, or durable persistence on the database provider Todd identified. Do not describe the current heuristic score as an enterprise certification or run submitted repository code.

## Completed in this update

- Added a process-wide cap of three concurrent repository scans in addition to the existing per-IP request limiter and per-scan byte/file/concurrency budgets. Excess requests receive `503` and `Retry-After`.
- Changed unexpected scan failures to return generic client-facing errors while logging details server-side.
- Added baseline response security headers (MIME sniffing protection, referrer policy, and a restrictive CSP). Framing restrictions are intentionally omitted because Manus Preview is embedded in a cross-site iframe.
- Added Mongo connection/index initialization recovery so a transient failure does not permanently cache a rejected connection promise.
- Confirmed the production build, TypeScript check, and current automated tests pass.

## Launch blockers

1. **Identity and authorization:** the scan API is unauthenticated. UUID scan IDs are not access control. Before operating as a shared service, add an authentication provider and authorize every report/choice read and write to its owner. Until then, restrict deployment to a controlled, public-repository-only audience and do not submit sensitive information.
2. **Durable persistence:** the adapter is MongoDB-backed when `MONGO_URL` is set and process-local otherwise. Neon is not wired into this app. Select and configure the intended database, apply migrations/schema/index setup, set backups/retention, and verify recovery. Do not treat volatile storage as production persistence.
3. **Provider/deployment configuration:** no production deployment was performed. Configure the intended host, environment secrets, health monitoring, resource limits, logs/alerts, TLS/domain, and rollback process. The container and health endpoint must be exercised in the actual target environment before release.
4. **Scale controls:** the scan concurrency cap is per process, not distributed across instances, and the current IP limiter is also process-local unless its store is externalized. Use a shared limiter/queue and plan global quotas before horizontal scaling.
5. **Assurance limits:** readiness checks are heuristics. The app does not run repository code, verify CI results, scan complete dependency advisories, inspect Git history for secrets, or apply GitHub changes. Keep these capabilities clearly disclosed; do not expose a terminal or connect an executor without a dedicated isolated backend.
6. **Operations/privacy:** define retention and deletion behavior for stored reports and user choices, log redaction, support/incident response, abuse handling, and an explicit privacy notice before onboarding external users.

## Verification evidence

- `pnpm typecheck` — passed.
- `pnpm test` — passed, 4 files / 14 tests.
- `pnpm build` — passed; 1,579 modules transformed.
- Production publication and external-provider configuration — not performed.
