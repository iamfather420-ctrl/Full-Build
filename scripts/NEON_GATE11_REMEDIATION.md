# Neon GATE-11 production audit and remediation candidate

## Verified production findings (2026-10-20)

The read-only Neon audit of project `SolveX`, default branch `production`, database `neondb` found:

- `solvex_runtime_login` can log in but has `CREATEDB`, `CREATEROLE`, `REPLICATION`, and `BYPASSRLS` flags, and inherits `neon_superuser`.
- `solvex_app_runtime` is a non-login role with least-privilege role flags.
- 37 public base tables were present. 36 had RLS enabled, 32 had RLS forced, and 32 had at least one policy.
- `payment_orders`, `payment_fulfillments`, and `payment_refunds` had RLS enabled but not forced and had no policies.
- `payment_events` had RLS enabled but not forced, no policy, and no `tenant_id` column.
- `_migrations` has no tenant key or RLS; treat it as migration metadata and do not expose it to application roles.

A read-only probe as `solvex_runtime_login` confirmed that it currently has SELECT privileges on tenant and payment tables. Without signed tenant claims, the tested tenant-scoped tables returned zero visible rows. That is useful but not sufficient: the role's BYPASSRLS capability defeats the security guarantee and must be removed.

## Files

- `neon-gate11-readonly-audit.sql` is read-only.
- `neon-gate11-remediation-candidate.sql` is a candidate change, not executed automatically. It removes the runtime login's elevated role flags and `neon_superuser` membership; forces RLS and installs tenant policies for the three tenant-scoped payment tables; and denies all access to unclassified `payment_events` while PayPal remains disabled.

## Safety and rollout

Do not apply the candidate directly to production before taking/confirming a recovery point, validating application role grants and signed-claim behavior, testing with the actual runtime login, and scheduling an approved change window. The candidate deliberately preserves the login role name and password. It may expose application paths that relied on bypassing RLS; that is precisely why production rollout must follow branch/staging validation.

No production schema or role was changed by this audit. PayPal remains disabled. This is not a claim of production readiness.
