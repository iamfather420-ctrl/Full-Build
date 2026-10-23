# Tenant Isolation Test Plan

Execute only on a non-production Neon branch after the candidate restricted runtime role, RLS policies, and signed-claim verifier are configured. This is a test plan; do not report a case as passed until it has actually executed.

## Preconditions
- The runtime role under test has `BYPASSRLS = false`, no elevated role flags, and is not a member of `neon_superuser`.
- Every application table with `tenant_id` has RLS enabled and forced, with a policy bound to the verified claim context and no owner/bypass path.
- The signed-claim mechanism is operational and its readiness check reports ready. If it is not ready, stop and report BLOCKED.
- Execute application queries as the restricted runtime role itself. Do not grant that role access to signing secrets or verifier key material.
- Use short-lived synthetic claims and synthetic rows only. Never place reusable tokens, signing keys, or real customer PII in test artifacts.

## Identity-provider contract
The product direction is to evaluate a first-party AGATE identity/NFT system. Until a replacement verifier is implemented, reviewed, and tested, existing fail-closed authentication checks must remain in place; an AGATE identifier or NFT alone must not be accepted as proof of an authenticated session or legal identity.

Before substituting AGATE for the current OIDC-based contract, the implementation must validate signature/proof, issuer, audience, expiry, replay protection, revocation, key rotation, account recovery, and binding from authenticated subject to tenant. Include negative tests for forged, expired, wrong-audience, wrong-issuer, revoked, and replayed credentials. Do not weaken or skip these tests to make the new path pass.

## Internal migration metadata exception
- The public `_migrations` table is migration bookkeeping, not a tenant-scoped application table. Prior audit notes reported that only `neondb_owner` had table privileges and that runtime roles had no SELECT/INSERT privileges; revalidate this on the branch under test.
- Do not add a broad policy or grant runtime access just to make this internal table appear RLS-protected.
- Record the table as an explicit, reviewed internal-table exception. Fail the audit if any runtime role receives privileges on `public._migrations`.

## Cases
1. **Same-tenant read:** tenant A claim reads tenant A rows; only tenant A rows are returned.
2. **Cross-tenant read:** tenant A claim queries tenant B rows; zero rows are returned.
3. **Cross-tenant insert/update/delete:** attempts to write or alter tenant B data are rejected by RLS/authorization.
4. **No claim:** missing authenticated context returns no tenant data and rejects mutations.
5. **Invalid claims:** forged signature/proof, expired token, future-issued token, wrong issuer/audience, revoked credential, replayed credential, and token lifetime over the configured maximum are rejected.
6. **Payment tables:** repeat applicable cases on `payment_orders`, `payment_fulfillments`, and `payment_refunds`; payment activation itself remains disabled.
7. **Unclassified payment events:** `payment_events` remains deny-all for the runtime role unless an explicitly reviewed policy says otherwise.
8. **Indirect paths:** test views, joins, stored procedures, security-definer functions, background jobs, and APIs for cross-tenant leaks or privilege escalation.
9. **Tenant-binding tampering:** a valid subject credential with a modified tenant ID must not grant access to another tenant.
10. **Recovery and revocation:** after simulated revocation or account recovery, old credentials must fail according to the documented policy.

## Evidence
For each case record exact SQL/API request, role, synthetic tenant identifiers, expected and actual result, timestamp, non-production branch ID, source commit SHA, and pass/fail. Store evidence under an appropriately dated `artifacts/isolation-YYYY-MM-DD.json` path. Redact secrets and tokens. Link the evidence to the exact commit tested.

## Fail-closed rule
Any cross-tenant data exposure, unauthorized write, invalid credential acceptance, or privilege bypass blocks release. If the verifier, signed claims, test environment, or restore cannot be exercised, report BLOCKED; never infer success from code review or documentation.
