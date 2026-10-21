# Tenant Isolation Test Plan

Execute only on a non-production Neon branch after the GATE-11 candidate role and RLS policies are applied.

## Preconditions
- Role under test has `BYPASSRLS = false` and is not a member of `neon_superuser`.
- Every public table with `tenant_id` has RLS enabled + forced and a `solvex_tenant_access` policy that matches `solvex_private.current_claims() ->> 'tenant_id'` with no OWNER bypass.
- Signed claim mechanism is functional (`auth_context_ready = true`).

## Cases
1. **Same-tenant read** — Claim for tenant A, SELECT from `users` / `orders` where `tenant_id = A`. Expect rows.
2. **Cross-tenant read** — Claim for tenant A, SELECT where `tenant_id = B`. Expect zero rows.
3. **Cross-tenant write** — Claim for tenant A, INSERT/UPDATE with `tenant_id = B`. Expect RLS rejection.
4. **No claim** — No signed context. SELECT and INSERT both fail closed.
5. **Payment tables** — Repeat 1–4 on `payment_orders`, `payment_fulfillments`, `payment_refunds`.
6. **Unclassified** — `payment_events` remains deny-all for the runtime role.
7. **Indirect paths** — Any views, security-definer functions, or joins that could leak across tenants. Expect no leakage.

## Evidence
Record the exact SQL, role used, claim used, and result for each case. Store as `artifacts/isolation-YYYY-MM-DD.json`.

## Fail-closed rule
If any cross-tenant path returns data or succeeds a write, the role change is blocked.
