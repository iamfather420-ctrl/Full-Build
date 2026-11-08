export interface NeonReadOnlyQuery {
  (sql: string, params?: unknown[]): Promise<any[]>;
}

export interface NeonSandboxAuditResult {
  configured: boolean;
  connected: boolean;
  required_tables: number;
  present_tables: number;
  missing_tables: string[];
  rls_enabled_tables: number;
  forced_rls_tables: number;
  tables_without_policy: string[];
  role_bypasses_rls: boolean | null;
  tenant_isolation_verified: boolean;
  read_only: true;
  reason: string;
}

const REQUIRED_TABLES = [
  'users', 'tenants', 'roles', 'permissions', 'tenant_memberships',
  'problems', 'paradoxes', 'invariants', 'solutions', 'offers',
  'proof_bundles', 'proof_evidence', 'tests', 'verification_runs',
  'orders', 'payments', 'deployments', 'checkpoints', 'rollback_records',
  'telemetry', 'audit_records', 'chain_records', 'licenses',
  'adapter_status', 'node_registry', 'execution_runs', 'failures'
] as const;

/**
 * Read-only sandbox database audit. Requires a separately provisioned
 * NEON_SANDBOX_DATABASE_URL; never falls back to DATABASE_URL/production URLs.
 * No migrations, inserts, updates, deletes, or DDL are issued.
 */
export class NeonSandboxReadOnlyAudit {
  constructor(private readonly query: NeonReadOnlyQuery) {}

  static async fromSandboxEnvironment(): Promise<NeonSandboxReadOnlyAudit | null> {
    if (process.env.SOLVEX_ENV !== 'sandbox' || process.env.NODE_ENV === 'production') return null;
    const url = process.env.NEON_SANDBOX_DATABASE_URL;
    if (!url) return null;
    const { neon } = await import('@neondatabase/serverless');
    const client = neon(url);
    return new NeonSandboxReadOnlyAudit((sql, params = []) => client.query(sql, params));
  }

  async audit(): Promise<NeonSandboxAuditResult> {
    const base: NeonSandboxAuditResult = {
      configured: true,
      connected: false,
      required_tables: REQUIRED_TABLES.length,
      present_tables: 0,
      missing_tables: [...REQUIRED_TABLES],
      rls_enabled_tables: 0,
      forced_rls_tables: 0,
      tables_without_policy: [...REQUIRED_TABLES],
      role_bypasses_rls: null,
      tenant_isolation_verified: false,
      read_only: true,
      reason: 'Read-only sandbox database audit has not completed.'
    };
    try {
      const ping = await this.query('SELECT 1 AS connected');
      if (Number(ping?.[0]?.connected) !== 1) {
        return { ...base, reason: 'Sandbox Neon connection probe failed.' };
      }
      const tableRows = await this.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
        [[...REQUIRED_TABLES]]
      );
      const present = new Set((tableRows || []).map((row: any) => String(row.table_name)));
      const missing = REQUIRED_TABLES.filter(name => !present.has(name));

      const postureRows = await this.query(`
        SELECT c.relname AS table_name,
               c.relrowsecurity AS rls_enabled,
               c.relforcerowsecurity AS rls_forced,
               (SELECT count(*)::int FROM pg_policies p
                 WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policy_count,
               COALESCE((SELECT r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user), false) AS role_bypass_rls
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname
      `, [[...REQUIRED_TABLES]]);
      const rows = Array.isArray(postureRows) ? postureRows : [];
      const withoutPolicy = rows.filter((r: any) => Number(r.policy_count) < 1).map((r: any) => String(r.table_name));
      const rlsEnabled = rows.filter((r: any) => r.rls_enabled === true).length;
      const forced = rows.filter((r: any) => r.rls_forced === true).length;
      const bypass = rows.length && typeof rows[0].role_bypass_rls === 'boolean'
        ? rows[0].role_bypass_rls : null;
      const tenantSafe = missing.length === 0 && rows.length === REQUIRED_TABLES.length
        && rlsEnabled === REQUIRED_TABLES.length && forced === REQUIRED_TABLES.length
        && withoutPolicy.length === 0 && bypass === false;

      return {
        configured: true,
        connected: true,
        required_tables: REQUIRED_TABLES.length,
        present_tables: present.size,
        missing_tables: missing,
        rls_enabled_tables: rlsEnabled,
        forced_rls_tables: forced,
        tables_without_policy: withoutPolicy,
        role_bypasses_rls: bypass,
        tenant_isolation_verified: tenantSafe,
        read_only: true,
        reason: tenantSafe
          ? 'Sandbox Neon connection, required tables, forced RLS policies, and non-bypass role verified. No data was changed.'
          : 'Connected read-only, but required schema or tenant-isolation controls are incomplete.'
      };
    } catch {
      return { ...base, reason: 'Read-only sandbox Neon audit failed; details withheld to avoid exposing connection information.' };
    }
  }
}
