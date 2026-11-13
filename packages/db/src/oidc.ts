import { neon } from "@neondatabase/serverless";

/**
 * Verifies the database-HMAC tenant token on the specified database.
 * This module is deliberately separate from the application DB singleton so
 * isolated verification can run when the application DB URL is absent.
 */
export async function verifyOidcTenantToken(
  token: string,
  verificationDatabaseUrl: string,
): Promise<Record<string, unknown> | null> {
  if (!token || token.length > 8192 || !verificationDatabaseUrl) return null;
  const verifySql = neon(verificationDatabaseUrl);
  const rows = await verifySql`
    WITH token_context AS MATERIALIZED (
      SELECT set_config('app.auth_token', ${token}, true) AS configured
    ),
    claims AS MATERIALIZED (
      SELECT solvex_private.current_claims() AS value FROM token_context
    )
    SELECT c.value
      FROM claims c
      JOIN public.users u
        ON u.id = c.value->>'user_id'
       AND lower(u.email) = lower(c.value->>'email')
       AND u.status = 'ACTIVE'
      JOIN public.tenant_memberships m
        ON m.user_id = u.id
       AND m.tenant_id = c.value->>'tenant_id'
       AND m.status = 'ACTIVE'
      JOIN public.tenants t
        ON t.id = m.tenant_id
       AND t.status = 'ACTIVE'
      JOIN public.roles r
        ON r.id = m.role_id
       AND r.tenant_id = m.tenant_id
       AND r.status = 'ACTIVE'
       AND upper(r.name) = c.value->>'role'
     WHERE c.value IS NOT NULL
       AND (SELECT count(*) FROM public.tenant_memberships m2
            JOIN public.tenants t2 ON t2.id=m2.tenant_id AND t2.status='ACTIVE'
            JOIN public.roles r2 ON r2.id=m2.role_id AND r2.tenant_id=m2.tenant_id AND r2.status='ACTIVE'
            WHERE m2.user_id=u.id AND m2.status='ACTIVE'
              AND upper(r2.name) IN ('OWNER','ADMIN','VERIFIER','CUSTOMER')) = 1
  `;
  return rows.length === 1 && rows[0].value && typeof rows[0].value === "object"
    ? rows[0].value as Record<string, unknown>
    : null;
}
