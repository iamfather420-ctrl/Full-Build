# Production release checklist (PayPal excluded)

This checklist is a release gate, not evidence that the tasks have passed. The current build must remain non-ready until each applicable item has attached test evidence.

## Before staging

- [ ] Use the committed `bun.lock` with `bun install --frozen-lockfile` (the current `package-lock.json` is stale; do not claim `npm ci` reproducibility yet).
- [ ] Run `bun run lint`, `bun run verify:release-safety`, `bun run verify:api-security`, `bun run verify:120`, and `bun run verify:proof-closure`.
- [ ] Regenerate the formal verification reports with the authoritative project runner; do not hand-edit old report JSON.
- [ ] Configure a real OIDC issuer, API audience, client ID/secret, HTTPS JWKS URL, and exact HTTPS callback URI. The provider must issue RS256/ES256 JWT access tokens with signed `sub`, `tenant_id`, and approved `role` claims.
- [ ] Validate login, logout, nonce rejection, state replay rejection, PKCE verifier enforcement, key rotation, expiry, tenant scoping, and same-origin mutation checks against the real identity provider.
- [ ] If the deployment has more than one replica, replace in-process login state with a shared secure TTL store before setting readiness to ready.

## Neon and persistence

- [ ] Take a recoverable backup of the existing 27-table Neon database and demonstrate restore to a staging clone.
- [ ] Compare `information_schema.tables` and `information_schema.columns` on staging with the supplied domain schema. Table-name presence alone is not schema compatibility.
- [ ] Review `migrations/004_access_requests.sql` and apply it only to staging first. It is additive; it has not been applied to the live database.
- [ ] Port core domain reads/writes from SQLite/DurableStore to explicit Neon repositories that match the existing domain-specific schema. The old generic `payload_json` writer and bulk migration path are disabled intentionally.
- [ ] Run cross-tenant access-control tests with at least two tenants against Neon, including proofs, orders, access requests, verification runs, telemetry, and audit views.
- [ ] Verify restart persistence and idempotency against Neon; do not infer these from a successful connection test.

## Runtime and operations

- [ ] Put the service behind verified TLS termination; validate HSTS and the externally visible callback origin.
- [ ] Replace the per-process rate limiter with a shared/distributed limiter or edge/WAF policy and test limits across replicas.
- [ ] Configure a secret manager, least-privilege database role, log redaction, monitoring, alerts, and incident runbooks.
- [ ] Execute backup/restore, deployment rollback, dependency outage, OIDC outage, and Neon outage drills.
- [ ] Run the full 46 real-world production gates and attach evidence for every gate. The 120-case SAT-witness corpus is a formal corpus result, not a substitute for those gates.

## Payment policy

- PayPal, checkout, capture, credential testing, provider OAuth, and payment webhooks are disabled and not required for this release.
- Catalog prices are presentation metadata only. Access requests require human authorization and do not imply payment or deployment.
- Any future payment re-enable must be a separate reviewed change with sandbox tests and production authorization.
