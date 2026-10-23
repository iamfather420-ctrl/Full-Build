import { computeSha256 } from './DatabaseSchema';

export type PersistenceBackendType = 'SQLITE_LOCAL' | 'NEON_POSTGRES' | 'PERSISTENCE_UNAVAILABLE';

export interface PersistenceStatus {
  backend: PersistenceBackendType;
  configured: boolean;
  connected: boolean;
  tables_verified: number;
  total_required_tables: number;
  tenant_isolation_verified: boolean;
  restart_readback_verified: boolean;
  last_error?: string;
  notes: string;
}

export class NeonStore {
  private static instance: NeonStore | null = null;
  private databaseUrl: string | null = null;
  private neonClient: any = null;
  private isConnected: boolean = false;
  private lastError: string | null = null;
  private tablesVerified = 0;
  private readonly totalRequiredTables = 27;
  private tenantIsolationVerified = false;
  private restartReadbackVerified = false;

  private readonly requiredTables = [
    'users', 'tenants', 'roles', 'permissions', 'tenant_memberships',
    'problems', 'paradoxes', 'invariants', 'solutions', 'offers',
    'proof_bundles', 'proof_evidence', 'tests', 'verification_runs',
    'orders', 'payments', 'deployments', 'checkpoints', 'rollback_records',
    'telemetry', 'audit_records', 'chain_records', 'licenses',
    'adapter_status', 'node_registry', 'execution_runs', 'failures'
  ] as const;

  private isAllowedTable(tableName: string): boolean {
    return (this.requiredTables as readonly string[]).includes(tableName);
  }

  private constructor() {
    this.databaseUrl = (typeof process !== 'undefined' && (process.env?.NEON_DATABASE_URL || process.env?.DATABASE_URL)) || null;
  }

  public static getInstance(): NeonStore {
    if (!NeonStore.instance) {
      NeonStore.instance = new NeonStore();
    }
    return NeonStore.instance;
  }

  public isConfigured(): boolean {
    return Boolean(this.databaseUrl && this.databaseUrl.trim().length > 0);
  }

  public async connect(): Promise<boolean> {
    // Every connection attempt invalidates prior verification until the checks are rerun.
    this.tablesVerified = 0;
    this.tenantIsolationVerified = false;
    this.restartReadbackVerified = false;
    if (!this.isConfigured()) {
      this.isConnected = false;
      this.lastError = 'NEON_DATABASE_URL or DATABASE_URL not configured';
      return false;
    }

    try {
      const neonMod = await import('@neondatabase/serverless');
      if (neonMod && typeof neonMod.Pool === 'function') {
        this.neonClient = new neonMod.Pool({ connectionString: this.databaseUrl! });
        // Pool.query is the API used by migrations and parameterized operations below.
        // Do not mix the tagged-template neon() API with node-postgres .query() calls.
        const testRes = await this.neonClient.query('SELECT 1 AS connected');
        if (testRes?.rows?.[0]?.connected === 1 || testRes?.rows?.[0]?.connected === '1') {
          this.isConnected = true;
          this.lastError = null;
          return true;
        }
      }
      this.isConnected = false;
      this.lastError = 'Neon connection test query failed';
      return false;
    } catch (e: any) {
      this.isConnected = false;
      this.lastError = e?.message || 'Failed to connect to Neon PostgreSQL';
      return false;
    }
  }

  public getStatus(): PersistenceStatus {
    const isConf = this.isConfigured();
    if (!isConf) {
      return {
        backend: 'PERSISTENCE_UNAVAILABLE',
        configured: false,
        connected: false,
        tables_verified: 0,
        total_required_tables: this.totalRequiredTables,
        tenant_isolation_verified: false,
        restart_readback_verified: false,
        notes: 'NEON_DATABASE_URL and DATABASE_URL are not configured. No durable backend is verified; any in-memory or browser-local fallback must not be represented as cloud or server-side persistence.'
      };
    }

    return {
      backend: this.isConnected ? 'NEON_POSTGRES' : 'PERSISTENCE_UNAVAILABLE',
      configured: isConf,
      connected: this.isConnected,
      tables_verified: this.isConnected ? this.tablesVerified : 0,
      total_required_tables: this.totalRequiredTables,
      tenant_isolation_verified: this.isConnected && this.tenantIsolationVerified,
      restart_readback_verified: this.isConnected && this.restartReadbackVerified,
      last_error: this.lastError || undefined,
      notes: this.isConnected
        ? 'Connected directly to Neon serverless cloud PostgreSQL instance.'
        : `Neon configured but connection failed closed: ${this.lastError}`
    };
  }

  public async runMigrations(): Promise<{ success: boolean; tablesCreated: number; error?: string }> {
    // Generic schema creation is intentionally disabled. The production domain tables
    // have domain-specific columns and constraints; adding payload_json columns or
    // indexes here can conceal schema drift and bypass the reviewed migration process.
    // Apply only reviewed, versioned SQL migrations through the authorized deployment
    // workflow after schema diff, RLS, backup, and rollback checks have passed.
    this.lastError = 'Automatic generic Neon migrations are disabled; use reviewed versioned migrations';
    return {
      success: false,
      tablesCreated: 0,
      error: this.lastError
    };
  }

  public async verifyRequiredTables(): Promise<{ verified: number; required: number; missing: string[] }> {
    const required27 = [
      'users', 'tenants', 'roles', 'permissions', 'tenant_memberships',
      'problems', 'paradoxes', 'invariants', 'solutions', 'offers',
      'proof_bundles', 'proof_evidence', 'tests', 'verification_runs',
      'orders', 'payments', 'deployments', 'checkpoints', 'rollback_records',
      'telemetry', 'audit_records', 'chain_records', 'licenses',
      'adapter_status', 'node_registry', 'execution_runs', 'failures'
    ];
    if (!this.isConnected || !this.neonClient) {
      this.tablesVerified = 0;
      this.tenantIsolationVerified = false;
      return { verified: 0, required: required27.length, missing: required27 };
    }
    try {
      const result = await this.neonClient.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`, [required27]);
      const rows = Array.isArray(result) ? result : result?.rows;
      if (!Array.isArray(rows)) throw new Error('Unexpected Neon query result shape during table verification');
      const present = new Set(rows.map((r: any) => r.table_name));
      const missing = required27.filter(t => !present.has(t));
      this.tablesVerified = required27.length - missing.length;
      return { verified: this.tablesVerified, required: required27.length, missing };
    } catch (e: any) {
      this.lastError = e?.message || 'Failed to verify Neon tables';
      this.tablesVerified = 0;
      return { verified: 0, required: required27.length, missing: required27 };
    }
  }

  /**
   * Read-only audit of PostgreSQL row-level security. This never changes schema or policies.
   * "Connected" is not evidence that tenant isolation is enabled; callers must inspect this result.
   */
  public async verifyRlsPosture(): Promise<{
    success: boolean;
    public_tables: number;
    rls_enabled_tables: number;
    forced_rls_tables: number;
    policy_count: number;
    current_role: string | null;
    current_role_bypass_rls: boolean | null;
    tables_without_rls: string[];
    tables_without_policy: string[];
    error?: string;
  }> {
    this.tenantIsolationVerified = false;
    const empty = {
      success: false,
      public_tables: 0,
      rls_enabled_tables: 0,
      forced_rls_tables: 0,
      policy_count: 0,
      current_role: null as string | null,
      current_role_bypass_rls: null as boolean | null,
      tables_without_rls: [] as string[],
      tables_without_policy: [] as string[]
    };
    if (!this.isConnected || !this.neonClient) {
      return { ...empty, error: this.lastError || 'Neon not connected' };
    }
    try {
      const result = await this.neonClient.query(`
        SELECT c.relname AS table_name,
               c.relrowsecurity AS rls_enabled,
               c.relforcerowsecurity AS rls_forced,
               (SELECT count(*)::int FROM pg_policies p
                 WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policy_count,
               current_user AS current_role,
               COALESCE((SELECT r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user), false) AS role_bypass_rls
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
          AND c.relname NOT LIKE '\\_%' ESCAPE '\\'
        ORDER BY c.relname
      `);
      const tables = Array.isArray(result) ? result : (Array.isArray(result?.rows) ? result.rows : []);
      const withoutRls = tables.filter((r: any) => r.rls_enabled !== true).map((r: any) => String(r.table_name));
      const withoutPolicy = tables.filter((r: any) => Number(r.policy_count) < 1).map((r: any) => String(r.table_name));
      const forced = tables.filter((r: any) => r.rls_forced === true).length;
      const policyCount = tables.reduce((sum: number, r: any) => sum + Number(r.policy_count || 0), 0);
      const role = tables[0]?.current_role ? String(tables[0].current_role) : null;
      const bypass = typeof tables[0]?.role_bypass_rls === 'boolean' ? tables[0].role_bypass_rls : null;
      const success = tables.length > 0 && withoutRls.length === 0 && withoutPolicy.length === 0 && forced === tables.length && bypass === false;
      this.tenantIsolationVerified = success;
      return {
        success,
        public_tables: tables.length,
        rls_enabled_tables: tables.length - withoutRls.length,
        forced_rls_tables: forced,
        policy_count: policyCount,
        current_role: role,
        current_role_bypass_rls: bypass,
        tables_without_rls: withoutRls,
        tables_without_policy: withoutPolicy
      };
    } catch (e: any) {
      return { ...empty, error: e?.message || 'Read-only RLS audit failed' };
    }
  }

  public async insertRecord(_tableName: string, _data: Record<string, any>): Promise<boolean> {
    // Generic JSON persistence is disabled until every domain table has a reviewed,
    // schema-specific repository and tenant-isolation integration tests. Do not write
    // data into guessed columns or allow an upsert to imply persistence is verified.
    this.lastError = 'Generic Neon writes are disabled pending schema-specific repositories and tenant-isolation tests';
    return false;
  }

  public async findTenantRecords(tableName: string, tenantId: string, limit: number = 100): Promise<any[]> {
    if (!this.isConnected || !this.neonClient) return [];
    if (!this.isAllowedTable(tableName) || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      this.lastError = 'Rejected tenant read with an invalid table or tenant identifier';
      return [];
    }
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 500)) : 100;
    try {
      const result = await this.neonClient.query(`
        SELECT * FROM ${tableName} WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2
      `, [tenantId.trim(), safeLimit]);
      const rows = Array.isArray(result) ? result : result?.rows;
      if (!Array.isArray(rows)) throw new Error('Unexpected Neon query result shape during tenant read');
      return rows.map((r: any) => ({ ...r, ...r.payload_json }));
    } catch {
      return [];
    }
  }
}
