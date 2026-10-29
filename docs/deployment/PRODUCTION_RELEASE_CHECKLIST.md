# Production release checklist (PayPal excluded)

This checklist is a release gate, not evidence that the tasks have passed. The current build must remain non-ready until each applicable item has attached test evidence.

## Before staging

- [ ] Use the committed `bun.lock` with `bun install --frozen-lockfile` (the current `package-lock.json` is stale; do not claim `npm ci` reproducibility yet).
- [ ] Run `bun run lint`, `bun run verify:release-safety`, `bun run verify:payments-disabled`, `bun run verify:enterprise`, `bun run verify:120`, and `bun run verify:proof-closure`. These are the defined package scripts; do not invoke an undefined `verify:api-security` script.
- [ ] Regenerate the formal verification reports with the authoritative project runner; do not hand-edit old report JSON.
- [ ] Configure a real OIDC issuer, API audience, client ID/secret, HTTPS JWKS URL, and exact HTTPS callback URI. The provider must issue RS256/ES256 JWT access tokens with signed `sub`, `tenant_id`, and approved `role` claims.
- [ ] Validate login, logout, nonce rejection, state replay rejection, PKCE verifier enforcement, key rotation, expiry, tenant scoping, and same-origin mutation checks against the real identity provider.
- [ ] If the deployment has more than one replica, replace in-process login state with a shared secure TTL store before setting readiness to ready.

## Neon and persistence

- [ ] Take a recoverable backup of the existing Neon database and demonstrate restore to a staging clone before any schema change.
- [ ] Compare `information_schema.tables` and `information_schema.columns` on staging with the supplied domain schema. Table-name presence alone is not schema compatibility.
- [ ] Reconcile migration history before applying any migration. A read-only inspection of the configured SolveX production branch on 2026-10-26 found the `access_requests` table already present, alongside both `_migrations` and `schema_migrations` ledgers. Do not reapply `migrations/004_access_requests.sql` without verifying its effects and migration history.
- [ ] The inspected production branch contains 37 tables in `public` and one table in `solvex_private`; reconcile this actual schema against the repository's supplied domain schema rather than relying on the older 27-table count.
- [ ] Port core domain reads/writes from SQLite/DurableStore to explicit Neon repositories that match the existing domain-specific schema. The old generic `payload_json` writer and bulk migration path are disabled intentionally.
- [ ] Run cross-tenant access-control tests with at least two tenants against Neon, including proofs, orders, access requests, verification runs, telemetry, and audit views.
- [ ] Verify restart persistence and idempotency against Neon; do not infer these from a successful connection test.
- [ ] Confirm row-level security is enabled and forced for every tenant-scoped table, with reviewed policies and least-privilege grants. The inspected production branch had RLS enabled and forced on all listed public tables; `_migrations` and `solvex_private.auth_secrets` did not have RLS enabled/forced and require an explicit privilege/policy review.

## Runtime and operations

- [ ] Put the service behind verified TLS termination; validate HSTS and the externally visible callback origin.
- [ ] Replace the per-process rate limiter with a shared/distributed limiter or edge/WAF policy and test limits across replicas.
- [ ] Configure a secret manager, least-privilege database role, log redaction, monitoring, alerts, and incident runbooks.
- [ ] Execute backup/restore, deployment rollback, dependency outage, OIDC outage, and Neon outage drills.
- [ ] Run the full 46 real-world production gates and attach evidence for every gate. The 120-case SAT-witness corpus is a formal corpus result, not a substitute for those gates.

## Read-only production reconciliation — 2026-10-29

These are observed facts from read-only Neon/Vercel inspection. They are not a production-change authorization.

### Neon schema and tenant security

- Inspected Neon project `SolveX`, production branch `br-soft-dawn-b4wkrjox`. The catalog lists 37 tables in `public` and one table in `solvex_private`.
- RLS is enabled and forced on 36 public tables. `public._migrations` and `solvex_private.auth_secrets` have RLS disabled; both require explicit privilege review. The latter was not granted to `solvex_app_runtime` or `solvex_runtime_login_v2`, but is granted to the owner and legacy `solvex_runtime_login`.
- All ordinary tenant tables inspected use policies comparing `tenant_id` to `solvex_private.current_claims()->>'tenant_id'`. Payment-specific tables have explicit `false` policies and remain default-deny.
- **Open policy defect to fix in a reviewed staging migration:** `public.tenants` is protected by the same `tenant_id` predicate, but its observed row has `tenant_id IS NULL` and `tenant_id` is not the primary key. Confirm the intended model and test a policy using the tenant primary key before any production migration.
- **Critical role issue:** legacy `solvex_runtime_login` can log in, has `BYPASSRLS`, `CREATEDB`, `CREATEROLE`, membership in `neon_superuser`, and access to `auth_secrets`. Do not use this role for application runtime. No production role changes were made.
- `solvex_runtime_login_v2` has `BYPASSRLS=false`, but `NOINHERIT` and no direct table privileges were observed. It is a member of `solvex_app_runtime`; the application must demonstrate its intended role-switch/privilege path in a staging integration test before readiness can pass.
- The live database has no verified typed repository integration from this audit. `NeonStore.runMigrations()` and generic writes remain deliberately blocked; successful connectivity or RLS catalog checks are not proof of persistence, restart readback, or cross-tenant isolation.

### Vercel, backups, and rollback

- The Vercel project `uarefake` reports `live=false`; its latest deployment is `READY` but has `target=null` and is sourced from `iamfather420-ctrl/Uarefake-1`, branch `feat/daisy-self-hosted-auth-20261027`, commit `8ce7976d79c06e841341829a1a05be9d4d2fdcbd`—not `Full-Build/main`.
- The custom domain `uarefake.space` is currently marked verified. Domain verification does not prove the correct repository/branch is serving production.
- `.github/workflows/daily-backup.yml` creates a code archive and Neon custom-format dump, checks `gzip -t` and `pg_restore --list`, and uploads 30-day artifacts. This is archive/dump integrity, **not** a full restore test.
- Neon exposes an archived `solvex-recovery-drill-2026-10-14` branch with restore metadata, but this audit did not establish a current application-level restore/readback test or a production deployment rollback drill.
- No Vercel promotion/deployment, Neon mutation, role change, credential change, or payment operation was performed during this inspection.

## Payment policy

- PayPal, checkout, capture, credential testing, provider OAuth, and payment webhooks are disabled and not required for this release.
- Catalog prices are presentation metadata only. Access requests require human authorization and do not imply payment or deployment.
- Any future payment re-enable must be a separate reviewed change with sandbox tests and production authorization.
