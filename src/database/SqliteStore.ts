import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface SqliteDbInterface {
  exec(sql: string): void;
  all(sql: string, params?: any[]): any[];
  get(sql: string, params?: any[]): any;
  run(sql: string, params?: any[]): { changes: number; lastInsertRowid?: number };
}

/**
 * Server-only durable repository for tenant-scoped records.
 *
 * Every logical entity table has an explicit tenant_id, JSON payload, timestamps,
 * and a primary key. Values are always parameterized; table names are selected from
 * a closed allow-list. Browser callers are rejected rather than falling back to
 * localStorage or an in-memory pseudo-database.
 */
export class SqliteStore {
  private static instance: SqliteStore | null = null;
  private readonly db: DatabaseSync;
  private readonly tables = [
    'users', 'tenants', 'roles', 'permissions', 'tenant_memberships',
    'problems', 'paradoxes', 'invariants', 'solutions', 'offers',
    'proof_bundles', 'proof_evidence', 'tests', 'verification_runs',
    'orders', 'payments', 'deployments', 'checkpoints', 'rollback_records',
    'telemetry', 'audit_records', 'chain_records', 'licenses',
    'adapter_status', 'node_registry', 'execution_runs', 'failures'
  ] as const;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('SqliteStore is server-only and cannot be initialized in a browser bundle');
    }

    const dbPath = resolve(process.cwd(), process.env.SOLVEX_DB_PATH || '.sovereign_data/solvex.sqlite');
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    this.runMigrations();
  }

  public static getInstance(): SqliteStore {
    if (!SqliteStore.instance) {
      SqliteStore.instance = new SqliteStore();
    }
    return SqliteStore.instance;
  }

  public getRawDb(): SqliteDbInterface {
    return {
      exec: (sql: string) => this.db.exec(sql),
      all: (sql: string, params: any[] = []) => this.db.prepare(sql).all(...params) as any[],
      get: (sql: string, params: any[] = []) => this.db.prepare(sql).get(...params) as any,
      run: (sql: string, params: any[] = []) => {
        const result = this.db.prepare(sql).run(...params);
        return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
      }
    };
  }

  public getTableCount(): number {
    return this.tables.length;
  }

  private assertTable(tableName: string): asserts tableName is (typeof this.tables)[number] {
    if (!(this.tables as readonly string[]).includes(tableName)) {
      throw new Error(`Unsupported repository table: ${tableName}`);
    }
  }

  private runMigrations(): void {
    for (const table of this.tables) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY NOT NULL,
          tenant_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          status TEXT NOT NULL,
          version TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_${table}_tenant_updated ON ${table}(tenant_id, updated_at DESC);
      `);
    }

    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_capture
      ON payments(json_extract(payload, '$.paypal_capture_id'))
      WHERE json_extract(payload, '$.paypal_capture_id') IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order
      ON payments(json_extract(payload, '$.paypal_order_id'))
      WHERE json_extract(payload, '$.paypal_order_id') IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_tenant_idempotency
      ON payments(tenant_id, json_extract(payload, '$.idempotency_key'))
      WHERE json_extract(payload, '$.idempotency_key') IS NOT NULL;
    `);
  }

  private decode(row: any): any | undefined {
    if (!row) return undefined;
    try {
      const payload = JSON.parse(row.payload || '{}');
      return {
        ...payload,
        id: row.id,
        tenant_id: row.tenant_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        status: row.status,
        version: row.version
      };
    } catch {
      throw new Error(`Corrupt durable record: ${row.id}`);
    }
  }

  public findTenantRecords<T = any>(tableName: string, tenantId: string, limit = 100): T[] {
    this.assertTable(tableName);
    if (!tenantId) throw new Error('Tenant context is required for repository reads');
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 1000));
    const rows = this.db.prepare(
      `SELECT id, tenant_id, payload, created_at, updated_at, status, version
       FROM ${tableName} WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT ?`
    ).all(tenantId, safeLimit) as any[];
    return rows.map(row => this.decode(row)) as T[];
  }

  public findAllRecords<T = any>(tableName: string, limit = 100): T[] {
    this.assertTable(tableName);
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 1000));
    const rows = this.db.prepare(
      `SELECT id, tenant_id, payload, created_at, updated_at, status, version
       FROM ${tableName} ORDER BY updated_at DESC LIMIT ?`
    ).all(safeLimit) as any[];
    return rows.map(row => this.decode(row)) as T[];
  }

  public findRecordById<T = any>(tableName: string, id: string): T | undefined {
    this.assertTable(tableName);
    const row = this.db.prepare(
      `SELECT id, tenant_id, payload, created_at, updated_at, status, version FROM ${tableName} WHERE id = ?`
    ).get(id);
    return this.decode(row) as T | undefined;
  }

  public findTenantRecordById<T = any>(tableName: string, tenantId: string, id: string): T | undefined {
    const record = this.findRecordById<T>(tableName, id);
    return record && (record as any).tenant_id === tenantId ? record : undefined;
  }

  public insertTenantRecord(tableName: string, tenantId: string, data: Record<string, any>): void {
    this.insertRecord(tableName, { ...data, tenant_id: tenantId });
  }

  public insertRecord(tableName: string, data: Record<string, any>): void {
    this.assertTable(tableName);
    if (!data.id || !data.tenant_id) throw new Error(`id and tenant_id are required for ${tableName}`);

    const existing = this.findRecordById<any>(tableName, String(data.id));
    if (existing && existing.tenant_id !== data.tenant_id) {
      throw new Error(`Cross-tenant identifier collision rejected for ${tableName}:${data.id}`);
    }

    const now = Date.now();
    const record = {
      ...(existing || {}),
      ...data,
      created_at: existing?.created_at || data.created_at || now,
      updated_at: now,
      status: data.status || existing?.status || 'ACTIVE',
      version: data.version || existing?.version || '1.0.0'
    };
    const payload = { ...record };
    delete payload.id;
    delete payload.tenant_id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.status;
    delete payload.version;

    this.db.prepare(`
      INSERT INTO ${tableName}(id, tenant_id, payload, created_at, updated_at, status, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        tenant_id = excluded.tenant_id,
        payload = excluded.payload,
        updated_at = excluded.updated_at,
        status = excluded.status,
        version = excluded.version
    `).run(
      String(record.id),
      String(record.tenant_id),
      JSON.stringify(payload),
      Number(record.created_at),
      Number(record.updated_at),
      String(record.status),
      String(record.version)
    );
  }

  public updateTenantRecord(tableName: string, tenantId: string, id: string, updates: Record<string, any>): number {
    const existing = this.findTenantRecordById<any>(tableName, tenantId, id);
    if (!existing) return 0;
    this.insertRecord(tableName, { ...existing, ...updates, id, tenant_id: tenantId });
    return 1;
  }

  public deleteTenantRecord(tableName: string, tenantId: string, id: string): number {
    this.assertTable(tableName);
    return Number(this.db.prepare(`DELETE FROM ${tableName} WHERE id = ? AND tenant_id = ?`).run(id, tenantId).changes);
  }

  public transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const value = operation();
      this.db.exec('COMMIT;');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }
}
