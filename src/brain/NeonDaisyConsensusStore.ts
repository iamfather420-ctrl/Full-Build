import { Pool } from '@neondatabase/serverless';
import { canonicalJson, ConsensusCertificate, sha256Canonical } from './IndependentUnanimousConsensus';

export const DAISY_CONSENSUS_PRODUCTION_HOST = 'ep-shy-salad-aynlw4d5.c-5.us-east-2.aws.neon.tech';
export const DAISY_CONSENSUS_STAGING_HOST = 'ep-rough-unit-aysyjj75.c-5.us-east-2.aws.neon.tech';

export interface ConsensusQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}
export interface ConsensusPgClient {
  query<Row = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<ConsensusQueryResult<Row>>;
  release(): void;
}
export interface ConsensusPgPool {
  connect(): Promise<ConsensusPgClient>;
  end(): Promise<void>;
}

export interface DaisyConsensusCertificateStore {
  consumeOnce(nonce: string, proposalSha256: string, consumedAt: number): Promise<boolean>;
  persistCertificate(certificate: ConsensusCertificate): Promise<boolean>;
  getCertificate(certificateSha256: string): Promise<ConsensusCertificate | null>;
  close(): Promise<void>;
}

function blocked(reason: string): never {
  throw new Error('DAISY_CONSENSUS_STORAGE_BLOCKED:' + reason);
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

/**
 * Durable replay and certificate storage on the existing Neon PostgreSQL project.
 * It never creates tables and never falls back to memory or local SQLite.
 */
export class NeonDaisyConsensusStore implements DaisyConsensusCertificateStore {
  constructor(
    private readonly pool: ConsensusPgPool,
    private readonly tenantId: string,
    private readonly expectedHost: string
  ) {
    if (!tenantId.trim()) blocked('SERVER_TENANT_ID_REQUIRED');
    if (![DAISY_CONSENSUS_PRODUCTION_HOST, DAISY_CONSENSUS_STAGING_HOST].includes(expectedHost)) {
      blocked('DATABASE_HOST_NOT_IN_EXISTING_SOLVEX_NEON_ALLOWLIST');
    }
  }

  public static async fromEnvironment(env: NodeJS.ProcessEnv = process.env): Promise<NeonDaisyConsensusStore> {
    const connectionString = env.DATABASE_URL || env.NEON_DATABASE_URL;
    const tenantId = env.DAISY_CONSENSUS_TENANT_ID;
    const expectedHost = env.DAISY_CONSENSUS_EXPECTED_DB_HOST;
    const solvexEnv = env.SOLVEX_ENV;
    if (!connectionString || !tenantId || !expectedHost || !solvexEnv) {
      blocked('DATABASE_URL_EXPECTED_HOST_TENANT_ID_AND_SOLVEX_ENV_REQUIRED');
    }

    let actualHost: string;
    try {
      actualHost = new URL(connectionString).hostname.toLowerCase();
    } catch {
      blocked('DATABASE_URL_INVALID');
    }
    if (actualHost !== expectedHost.toLowerCase()) blocked('DATABASE_HOST_DOES_NOT_MATCH_EXPLICIT_EXPECTED_HOST');

    if (solvexEnv === 'production' && expectedHost !== DAISY_CONSENSUS_PRODUCTION_HOST) {
      blocked('PRODUCTION_MUST_USE_EXISTING_NEON_PRODUCTION_BRANCH');
    }
    if (['staging', 'sandbox', 'development'].includes(solvexEnv) &&
        expectedHost !== DAISY_CONSENSUS_STAGING_HOST) {
      blocked('NON_PRODUCTION_MUST_USE_EXISTING_NEON_STAGING_BRANCH');
    }
    if (!['production', 'staging', 'sandbox', 'development'].includes(solvexEnv)) {
      blocked('SOLVEX_ENVIRONMENT_NOT_RECOGNIZED');
    }

    const pool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    }) as unknown as ConsensusPgPool;

    const store = new NeonDaisyConsensusStore(pool, tenantId, expectedHost);
    try {
      await store.verifySchema();
      return store;
    } catch (error) {
      await pool.end().catch(() => undefined);
      throw error;
    }
  }

  private async withTenant<T>(operation: (client: ConsensusPgClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [this.tenantId]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private async verifySchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const ping = await client.query<{ connected: number }>('SELECT 1 AS connected');
      if (Number(ping.rows[0]?.connected) !== 1) blocked('DATABASE_CONNECTIVITY_PROBE_FAILED');

      const required = {
        daisy_consensus_nonces: ['tenant_id', 'nonce', 'proposal_sha256', 'consumed_at'],
        daisy_consensus_certificates: [
          'tenant_id', 'certificate_sha256', 'proposal_id', 'proposal_sha256',
          'evidence_sha256', 'policy_sha256', 'input_bundle_sha256', 'certificate_json', 'created_at'
        ]
      } as const;
      const columns = await client.query<{ table_name: string; column_name: string }>(
        "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = ANY($1::text[])",
        [Object.keys(required)]
      );
      const columnSet = new Set(columns.rows.map(row => row.table_name + '.' + row.column_name));
      for (const [table, names] of Object.entries(required)) {
        for (const name of names) {
          if (!columnSet.has(table + '.' + name)) blocked('REQUIRED_CONSENSUS_SCHEMA_MISSING:' + table + '.' + name);
        }
      }

      const role = await client.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
        'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user'
      );
      if (role.rows.length !== 1 || role.rows[0].rolbypassrls || role.rows[0].rolsuper) {
        blocked('DATABASE_ROLE_MUST_NOT_BYPASS_ROW_LEVEL_SECURITY');
      }

      const posture = await client.query<{
        table_name: string;
        rls_enabled: boolean;
        rls_forced: boolean;
        policy_name: string | null;
        policy_qual: string | null;
        policy_check: string | null;
      }>(
        "SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced, p.policyname AS policy_name, p.qual AS policy_qual, p.with_check AS policy_check FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname WHERE n.nspname='public' AND c.relname = ANY($1::text[])",
        [Object.keys(required)]
      );
      for (const table of Object.keys(required)) {
        const expectedPolicy = table + '_tenant_isolation';
        const row = posture.rows.find(item => item.table_name === table && item.policy_name === expectedPolicy);
        if (!row || row.rls_enabled !== true || row.rls_forced !== true ||
            !row.policy_qual?.includes("current_setting('app.tenant_id'") ||
            !row.policy_check?.includes("current_setting('app.tenant_id'")) {
          blocked('FORCED_TENANT_RLS_POLICY_MISSING:' + table);
        }
      }
    } finally {
      client.release();
    }
  }

  public async consumeOnce(nonce: string, proposalSha256: string, consumedAt: number): Promise<boolean> {
    if (!nonce.trim() || !isSha256(proposalSha256) || !Number.isFinite(consumedAt)) {
      blocked('NONCE_OR_PROPOSAL_BINDING_INVALID');
    }
    return this.withTenant(async client => {
      const result = await client.query<{ nonce: string }>(
        "INSERT INTO public.daisy_consensus_nonces (tenant_id, nonce, proposal_sha256, consumed_at) VALUES (current_setting('app.tenant_id', true), $1, $2, to_timestamp($3 / 1000.0)) ON CONFLICT (tenant_id, nonce) DO NOTHING RETURNING nonce",
        [nonce, proposalSha256, consumedAt]
      );
      return result.rows.length === 1;
    });
  }

  public async persistCertificate(certificate: ConsensusCertificate): Promise<boolean> {
    const { certificate_sha256, ...body } = certificate;
    if (!isSha256(certificate_sha256) || sha256Canonical(body) !== certificate_sha256 ||
        !certificate.proposal?.proposal_id || !isSha256(certificate.proposal.evidence_sha256) ||
        !isSha256(certificate.policy_sha256) || !isSha256(certificate.input_bundle_sha256)) {
      blocked('CONSENSUS_CERTIFICATE_INTEGRITY_INVALID');
    }
    return this.withTenant(async client => {
      const result = await client.query<{ certificate_sha256: string }>(
        "INSERT INTO public.daisy_consensus_certificates (tenant_id, certificate_sha256, proposal_id, proposal_sha256, evidence_sha256, policy_sha256, input_bundle_sha256, certificate_json, created_at) VALUES (current_setting('app.tenant_id', true), $1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz) ON CONFLICT (tenant_id, certificate_sha256) DO NOTHING RETURNING certificate_sha256",
        [
          certificate_sha256,
          certificate.proposal.proposal_id,
          sha256Canonical(certificate.proposal),
          certificate.proposal.evidence_sha256,
          certificate.policy_sha256,
          certificate.input_bundle_sha256,
          JSON.stringify(certificate),
          certificate.generated_at
        ]
      );
      if (result.rows.length === 1) return true;
      const existing = await client.query<{ certificate_json: unknown }>(
        "SELECT certificate_json FROM public.daisy_consensus_certificates WHERE tenant_id = current_setting('app.tenant_id', true) AND certificate_sha256 = $1",
        [certificate_sha256]
      );
      const value = existing.rows[0]?.certificate_json;
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return !!parsed && canonicalJson(parsed) === canonicalJson(certificate);
    });
  }

  public async getCertificate(certificateSha256: string): Promise<ConsensusCertificate | null> {
    if (!isSha256(certificateSha256)) blocked('CERTIFICATE_HASH_INVALID');
    return this.withTenant(async client => {
      const result = await client.query<{ certificate_json: unknown }>(
        "SELECT certificate_json FROM public.daisy_consensus_certificates WHERE tenant_id = current_setting('app.tenant_id', true) AND certificate_sha256 = $1",
        [certificateSha256]
      );
      const value = result.rows[0]?.certificate_json;
      if (!value) return null;
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return parsed as ConsensusCertificate;
    });
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
