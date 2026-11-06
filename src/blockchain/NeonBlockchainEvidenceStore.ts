import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from '@neondatabase/serverless';
import type { ApprovalNonceStore } from './SignedHumanRootApprovalProvider';
import type { BitcoinDaisyChainReport } from './types';

export interface PersistedVerificationReceipt {
  runId: string;
  reportHash: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Neon-backed nonce ledger and append-only verification receipt writer.
 * Supply a server-side Pool connected to the dedicated mmtai_blockchain schema.
 * Never construct this class with a browser-exposed database credential.
 */
export class NeonBlockchainEvidenceStore implements ApprovalNonceStore {
  constructor(private readonly pool: Pool) {}

  async consumeIfAbsent(nonce: string, expiresAt: number): Promise<boolean> {
    if (!nonce || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;
    const result = await this.pool.query(
      `INSERT INTO mmtai_blockchain.approval_nonces (nonce_hash, expires_at)
       VALUES ($1, to_timestamp($2 / 1000.0))
       ON CONFLICT (nonce_hash) DO NOTHING
       RETURNING nonce_hash`,
      [sha256(nonce), expiresAt]
    );
    return result.rows.length === 1;
  }

  async persistVerificationReport(
    tenantId: string,
    report: BitcoinDaisyChainReport
  ): Promise<PersistedVerificationReceipt> {
    if (!tenantId.trim()) throw new Error('Tenant ID is required for evidence persistence.');
    const canonical = JSON.stringify(report);
    const reportHash = sha256(canonical);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query<{ run_id: string }>(
        `INSERT INTO mmtai_blockchain.verification_runs
          (tenant_id, network, verification_scope, start_height, end_height, status,
           processed_blocks, failed_blocks, source, report_hash, report)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
         RETURNING run_id::text`,
        [tenantId, report.network, report.verification_scope, report.start_height, report.end_height,
          report.status, report.processed_blocks, report.failed_blocks, report.source, reportHash, canonical]
      );
      const runId = inserted.rows[0]?.run_id;
      if (!runId) throw new Error('Evidence receipt insert returned no run ID.');

      for (const chunk of report.chunks) {
        await client.query(
          `INSERT INTO mmtai_blockchain.verification_chunks
            (run_id, chunk_id, start_height, end_height, processed_blocks, authorization_status, status)
           VALUES ($1::uuid,$2,$3,$4,$5,$6,$7)`,
          [runId, chunk.chunk_id, chunk.start_height, chunk.end_height,
            chunk.processed_blocks, chunk.authorization_status, chunk.status]
        );
      }
      for (const block of report.blocks) {
        await client.query(
          `INSERT INTO mmtai_blockchain.verification_blocks
            (run_id, height, block_hash, verified, evidence)
           VALUES ($1::uuid,$2,NULLIF($3,''),$4,$5::jsonb)`,
          [runId, block.height, block.block_hash, block.verified, JSON.stringify(block)]
        );
      }
      await client.query('COMMIT');
      return { runId, reportHash };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

export type EvidencePool = Pool;
export type EvidencePoolClient = PoolClient;
