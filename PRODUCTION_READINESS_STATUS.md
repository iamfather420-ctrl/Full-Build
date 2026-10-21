# Production Readiness Status — SOLVEX + Daisy Haminja Full Build

**Release verdict: NOT PRODUCTION-READY.** This pass closes several security defects and implements a trusted OIDC sign-in path plus an additive access-request migration, while keeping PayPal disabled. The app is deliberately configured to fail its production readiness probe until persistence integration and live deployment gates are completed. No live Neon database was contacted or mutated in this pass.

## Implemented in this working archive

### Authentication and session security

- Retired public role-selecting `/api/auth/login` token minting with HTTP 410.
- Replaced predictable local token signing with HMAC-SHA-256 using `SOVEREIGN_AUTH_SECRET`, constant-time signature comparison, strict claim validation, and a maximum one-hour lifetime. Local HS256 issuance is prohibited in production.
- Added trusted OIDC authorization-code login with PKCE S256, one-time state, nonce validation, discovery/JWKS HTTPS enforcement in production, RS256/ES256 signature validation, issuer/audience/time checks, and server-side role-to-permission mapping.
- Access tokens are held in an HttpOnly cookie; JavaScript does not receive the token. Cookie-authenticated API mutations require a same-origin `Origin` header.
- Added a sign-in/sign-out control and backend session discovery to the UI. The UI still labels an unauthenticated visitor as a demo session; it does not let the client choose its role or tenant.
- Login state is currently held in process memory. Production readiness requires an explicitly single-replica deployment until a shared state store is implemented.

### API authorization and tenant isolation

- Protected API routes by default; only the public offer/paradox catalog and basic health endpoint bypass authentication.
- Restricted tenant inventory to `MANAGE_TENANTS`, order creation to `CREATE_ORDER`, pipeline execution to `RUN_PIPELINE`, proof access to evidence permissions, and system/adapter/audit details to privileged roles.
- Tenant-scoped API reads no longer fall back to a demo/root tenant for anonymous requests.
- Prevented tenant-ID collisions from overwriting an existing tenant record.
- Added cross-tenant problem checks for pipeline execution and tenant filtering for solution/verification/audit/deployment/telemetry reads.
- Pipeline output is marked `CANDIDATE` and `production_verified: false`; a deterministic simulated pipeline is not treated as proof of production correctness.
- Payment endpoints return HTTP 410 even for anonymous requests.

### Access requests and payments

- Added `/api/access-requests` read/create routes with authenticated tenant scope, idempotency keys, explicit human-review status, and `payment_state: DISABLED`.
- Added `migrations/004_access_requests.sql`, an additive migration for a dedicated `access_requests` table. It has **not** been applied to Neon.
- Disabled the old generic Neon `payload_json` writer and bulk migration path because they do not match the domain-specific schema in the supplied 27-table SQL. No fallback silently writes an access request to local SQLite.
- PayPal capture, credential testing, OAuth/network calls, direct checkout links, and payment setup remain disabled. No payment is processed.

### Runtime safety and readiness

- Added security response headers, a JSON request-body size cap, malformed/oversized-body handling, and a per-process request rate limit.
- Added `/healthz` for liveness and `/readyz` for fail-closed production readiness. The probe also requires valid reachable OIDC discovery and explicitly single-replica in-process login state.
- Production readiness requires OIDC configuration, HTTPS endpoints, database connectivity, required table inventory, the access-request schema, and explicit storage/configuration gates. It currently returns **not ready** because the core API still uses SQLite/DurableStore for most domain persistence and the live schema has not been reconciled.
- `NeonStore.runMigrations()` is disabled and performs no schema changes. Generic `NeonStore.insertRecord()` is also disabled to prevent incompatible writes against the existing schema.

See `docs/deployment/PRODUCTION_RELEASE_CHECKLIST.md` for the exact staging and production release sequence.

## Validation actually performed

- Native Z3 SAT-witness corpus from the preceding pass: **120/120 SAT**, 120 fresh-context replays, 120 independent witness checks, and 120 contradiction mutations returning UNSAT. This was native Z3 4.13.3.0 through the system C API, not the project's WASM pipeline.
- `node scripts/verify_release_safety.mjs`: **PASS**. It also checks the CI workflow for frozen Bun-lock installation, absence of live PayPal/Neon secrets, OIDC test wiring, and fail-closed production readiness.
- `node scripts/verify_payments_disabled.mjs`: **PASS**. The sandbox, closure, and production preflight code no longer reads PayPal credential environment variables or contacts the provider.
- TypeScript syntax transpilation for the 20 current auth/API/database/server/UI/verification files: **PASS, zero syntax diagnostics**.
- Local auth smoke test: valid token accepted, tampering rejected, customer token has no system-admin permission, local token issuance blocked in production: **PASS**.
- Mocked RSA OIDC smoke test: signature, issuer/audience/expiry, nonce, tenant/role mapping, least privilege, and tampering checks: **PASS**. A reproducible `scripts/verify_auth_contract.ts` test is wired into CI but could not be run via `tsx` locally because project dependencies are unavailable.

## Not yet verified / production blockers

1. **Official build and tests:** dependencies are not installed in this environment. Offline installation lacked cached dependencies and online registry access timed out. The official project TypeScript/Z3 WASM verification, full frontend build, API integration tests, and 46-gate suite were not executed after these changes.
2. **Dependency lockfile:** `package-lock.json` does not match the root dependencies in `package.json`; reproducible `npm ci` is not supported yet. The local CI workflow has been changed to use the in-sync committed `bun.lock` with `bun install --frozen-lockfile`; that workflow has not yet run on GitHub. Regenerate the npm lockfile in a dependency-enabled environment before claiming npm-based reproducibility.
3. **Live OIDC provider:** client ID/secret, issuer, audience, JWKS URL, callback URL, and provider-specific `tenant_id`/`role` claims are not configured or tested against a real identity provider. The access token must be a verifiable RS256/ES256 JWT carrying the expected signed claims.
4. **OIDC login-state storage:** the current state/PKCE map is in-process. Set `OIDC_SINGLE_REPLICA_MODE=true` only if the deployment is intentionally single-replica; multi-replica login requires a shared, secure, expiring state store.
5. **Neon schema and persistence:** the provided SQL defines domain-specific tables, while the legacy generic adapter assumed `payload_json`. The current main API still uses SQLite/DurableStore for most writes. The access-request migration is staged only; it has not been run against live Neon. The full application needs a reviewed domain-repository migration and tenant-isolation integration tests before production.
6. **Operational deployment:** TLS/reverse-proxy configuration, distributed rate limiting, secrets-manager integration, monitoring/alerting, backup/restore drills, recovery and rollback tests, and incident runbooks remain unverified.
7. **Formal evidence and 46 gates:** existing pre-remediation reports remain stale until regenerated by the authoritative dependency-backed commands. The 120-case native Z3 corpus does not certify all 46 real-world production gates.
8. **Certification claims:** this archive does not establish independent SOC 2, ISO, NIST, or other certification.
9. **PayPal:** intentionally disabled. Any future re-enable requires a separate reviewed change, credentials, sandbox testing, production authorization, and appropriate tests.

## Safety boundary

This build is a hardened **integration candidate**, not a production-certified release. It has not been deployed, committed to either GitHub account, or connected to the live Neon database. The existing 27-table database was not initialized, overwritten, migrated, or otherwise changed. Keep the release on a review branch until the dependency-backed build, OIDC provider, additive migration in staging, full Neon repository integration, 46-gate suite, and operational recovery gates pass.
