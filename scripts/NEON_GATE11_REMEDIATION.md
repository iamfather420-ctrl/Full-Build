# Neon GATE-11 production audit and remediation candidate

## Verified production findings (2026-10-20)

The read-only Neon audit of project `SolveX`, default branch `production`, database `neondb` found:

- `solvex_runtime_login` can log in but has `CREATEDB`, `CREATEROLE`, `REPLICATION`, and `BYPASSRLS` flags, and inherits `neon_superuser`.
- `solvex_app_runtime` is a non-login role with least-privilege role flags.
- 37 public base tables were present. 36 had RLS enabled, 32 had RLS forced, and 32 had at least one policy.
- `payment_orders`, `payment_fulfillments`, and `payment_refunds` had RLS enabled but not forced and had no policies.
- `payment_events` had RLS enabled but not forced, no policy, and no `tenant_id` column.
- `_migrations` has no tenant key or RLS; treat it as migration metadata and do not expose it to application roles.

A read-only probe as `solvex_runtime_login` confirmed SELECT privileges on tenant/payment tables. A branch-only SQL-native role test then confirmed that a newly created role with only `solvex_app_runtime` membership has no elevated flags, has access to established app tables, and sees zero `users`/`orders` rows without a signed tenant token. An attempted write without a valid tenant token was rejected by RLS. The test role has no payment-table grants, which is fail-closed while payments remain disabled.

## Files

- `neon-gate11-readonly-audit.sql` is read-only.
- `neon-gate11-remediation-candidate.sql` is a candidate change, not executed against production. It creates a new SQL-native login `solvex_runtime_v2` with no elevated membership, grants only the existing `solvex_app_runtime` role, forces RLS and installs tenant policies for the three tenant-scoped payment tables, and denies all access to unclassified `payment_events` while PayPal remains disabled. The payment-table policies require an exact signed `tenant_id` match; even an `OWNER` claim does not bypass tenant boundaries. Any cross-tenant operator workflow must use a separate explicitly audited authorization path. The existing elevated login remains untouched for rollback until the application is switched.

## Safety and rollout

Do not apply the candidate directly to production before taking/confirming a recovery point, validating application role grants and signed-claim behavior, testing with the actual runtime login, and scheduling an approved change window. The candidate deliberately preserves the login role name and password. It may expose application paths that relied on bypassing RLS; that is precisely why production rollout must follow branch/staging validation.

### Validation branch results (2026-10-20)

On the non-production branch `solvex-runtime-role-validation-2026-10-19`, strict tenant RLS policies were applied and verified for **34/34 public tables with a `tenant_id` column**: RLS enabled on 34/34, forced on 34/34, and strict tenant policy present on 34/34. A follow-up audit found **zero remaining policies containing the `OWNER` bypass**. `payment_events` remains forced-RLS with a deny-all policy because it has no `tenant_id`; `schema_migrations` is also deny-all. The application runtime role has no SELECT or INSERT privilege on `_migrations`, and no payment-table SELECT grant in this branch.

The signed auth context is still **not ready** on this branch (`auth_context_ready=false`; no qualifying `SOLVEX_AUTH_SECRET` row). Therefore signed-token cross-tenant replay and the complete runtime login path are **not proven**. Creating/altering a SQL-native login role through the current database connection was denied by role permissions; a temporary API-created test role inherited elevated flags and was immediately deleted. Do not describe the least-privilege login role as completed.

No production schema or role was changed. PayPal remains disabled. This is not a claim of production readiness.
