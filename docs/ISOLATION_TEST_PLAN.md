# Tenant Isolation Test Plan

Execute only on a non-production Neon branch after the GATE-11 candidate role and RLS policies are applied.

## Preconditions
- Role under test has `BYPASSRLS = false` and is not a member of `neon_superuser`.
- Every application table with `tenant_id` has RLS enabled + forced and a `solvex_tenant_access` policy that matches `solvex_private.current_claims() ->> 'tenant_id'` with no OWNER bypass.
- Signed claim mechanism is functional (`auth_context_ready = true`).
- Execute the application queries using the restricted login role itself. Do not grant that role access to `solvex_private.auth_secrets`; claims must be signed by a trusted test signer outside the database runtime role.
- Use only short-lived synthetic claims and synthetic test rows on the non-production branch.

## Internal migration metadata exception
- The public `_migrations` table is migration bookkeeping, not a tenant-scoped application table. The read-only audit found that only `neondb_owner` has table privileges; `solvex_app_runtime` and `solvex_iso_test` have no SELECT or INSERT privileges.
- Do not add a broad policy or grant runtime access just to make this internal table appear RLS-protected.
- The audit must report this as an explicit, reviewed internal-table exception, and must fail if any runtime role receives privileges on `public._migrations`. Keep application tables subject to the normal RLS requirements.

## Cases
1. **Same-tenant read** — Claim for tenant A, SELECT from `users` / `orders` where `tenant_id = A`. Expect only tenant A rows.
2. **Cross-tenant read** — Claim for tenant A, SELECT rows belonging to tenant B. Expect zero rows.
3. **Cross-tenant write** — Claim for tenant A, INSERT/UPDATE with `tenant_id = B`. Expect RLS rejection.
4. **No claim** — No signed context. SELECT returns no rows and INSERT/UPDATE is rejected.
5. **Invalid claims** — Forged signature, expired token, future-issued token, and token lifetime over 15 minutes must be rejected.
6. **Payment tables** — Repeat applicable cases on `payment_orders`, `payment_fulfillments`, and `payment_refunds`.
7. **Unclassified** — `payment_events` remains deny-all for the runtime role.
8. **Indirect paths** — Check views, security-definer functions, and joins that could leak cross-tenant data.

## Evidence
Record the exact SQL, role used, synthetic claim identifiers (never the signing secret or reusable token), expected result, actual result, timestamp, branch ID, and commit SHA. Store as `artifacts/isolation-YYYY-MM-DD.json`. Include explicit pass/fail for every case; no case may be marked passed unless it was executed.

## Fail-closed rule
If any cross-tenant path returns data or succeeds a write, the role change is blocked. If signed-claim execution or restore verification cannot run, report BLOCKED rather than inferring success.
