import {
  computeSha256,
  TenantEntity,
  ProblemEntity,
  SolutionEntity,
  OfferEntity,
  ProofBundleEntity,
  AuditRecordEntity,
  CheckpointEntity
} from './DatabaseSchema';
import { SqliteStore } from './SqliteStore';

export interface DurableState {
  tenants: Record<string, TenantEntity>;
  problems: Record<string, ProblemEntity>;
  solutions: Record<string, SolutionEntity>;
  offers: Record<string, OfferEntity>;
  proof_bundles: Record<string, ProofBundleEntity>;
  audit_chain: AuditRecordEntity[];
  checkpoints: Record<string, CheckpointEntity>;
}

/** Server-side state cache backed by a durable SQLite snapshot and audit records. */
export class DurableStore {
  private static instance: DurableStore | null = null;
  private readonly sqlite: SqliteStore;
  private state: DurableState;
  private readonly snapshotId = '__solvex_durable_state_v2__';

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('DurableStore is server-only and cannot be initialized in a browser bundle');
    }
    this.sqlite = SqliteStore.getInstance();
    this.state = {
      tenants: {}, problems: {}, solutions: {}, offers: {}, proof_bundles: {}, audit_chain: [], checkpoints: {}
    };
    this.load();
    this.bootstrapRootData();
    this.persist();
  }

  public static getInstance(): DurableStore {
    if (!DurableStore.instance) DurableStore.instance = new DurableStore();
    return DurableStore.instance;
  }

  /**
   * Legacy callers mutate this cache. Every production mutation must follow with persist(),
   * while critical flows use SqliteStore transactions for their primary records.
   */
  public getState(): DurableState {
    return this.state;
  }

  private load(): void {
    const snapshot = this.sqlite.findRecordById<any>('execution_runs', this.snapshotId);
    if (!snapshot?.state) return;
    const candidate = snapshot.state as DurableState;
    if (candidate.tenants && candidate.problems && candidate.solutions && candidate.offers && candidate.proof_bundles && candidate.audit_chain && candidate.checkpoints) {
      this.state = candidate;
    }
  }

  private bootstrapRootData(): void {
    if (Object.keys(this.state.tenants).length === 0) {
      for (const [id, name] of [
        ['TENANT_ENTERPRISE_DEMO', 'Enterprise Showcase Tenant'],
        ['TENANT_SOVEREIGN_ROOT', 'Sovereign Protocol Core']
      ] as const) {
        this.state.tenants[id] = {
          id,
          name,
          tier: 'ENTERPRISE',
          isolated_storage_key: computeSha256(`KEY_${id}`),
          created_at: Date.now(),
          status: 'ACTIVE'
        };
        this.sqlite.insertRecord('tenants', { ...this.state.tenants[id], tenant_id: 'SYSTEM' });
      }
    }
    if (this.state.audit_chain.length === 0) {
      this.appendAudit('TENANT_SOVEREIGN_ROOT', 'GENESIS_SENTINEL', 'SYSTEM_INITIALIZE', 'SYSTEM', 'SOLVEX_GENESIS', {
        status: 'GENESIS_SEEDED', version: '2.0.0', scope: 'LOCAL_DURABLE'
      });
    }
  }

  public appendAudit(tenantId: string, actor: string, action: string, targetEntity: string, targetId: string, payload: any): AuditRecordEntity {
    const timestamp = Date.now();
    const indexNum = this.state.audit_chain.length;
    const previousHash = indexNum > 0 ? this.state.audit_chain[indexNum - 1].record_hash : '0'.repeat(64);
    const payloadHash = computeSha256(JSON.stringify(payload));
    const recordHash = computeSha256(`${indexNum}:${timestamp}:${tenantId}:${actor}:${action}:${targetEntity}:${targetId}:${previousHash}:${payloadHash}`);
    const record: AuditRecordEntity = {
      id: `audit_${timestamp}_${indexNum}`,
      tenant_id: tenantId,
      index_num: indexNum,
      timestamp,
      actor,
      action,
      target_entity: targetEntity,
      target_id: targetId,
      payload,
      payload_hash: payloadHash,
      previous_hash: previousHash,
      record_hash: recordHash
    };

    this.sqlite.insertRecord('audit_records', {
      ...record,
      status: 'SEALED',
      integrity_scope: 'LOCAL_SHA256_CHAIN'
    });
    this.state.audit_chain.push(record);
    this.persist();
    return record;
  }

  public verifyChain(): { valid: boolean; total_records: number; reason?: string } {
    for (let i = 0; i < this.state.audit_chain.length; i++) {
      const rec = this.state.audit_chain[i];
      const expectedPrevious = i === 0 ? '0'.repeat(64) : this.state.audit_chain[i - 1].record_hash;
      if (rec.previous_hash !== expectedPrevious) return { valid: false, total_records: this.state.audit_chain.length, reason: `Broken chain link at index ${i}` };
      if (rec.payload_hash !== computeSha256(JSON.stringify(rec.payload))) return { valid: false, total_records: this.state.audit_chain.length, reason: `Payload hash mismatch at index ${i}` };
      const expected = computeSha256(`${rec.index_num}:${rec.timestamp}:${rec.tenant_id}:${rec.actor}:${rec.action}:${rec.target_entity}:${rec.target_id}:${rec.previous_hash}:${rec.payload_hash}`);
      if (rec.record_hash !== expected) return { valid: false, total_records: this.state.audit_chain.length, reason: `Record hash mismatch at index ${i}` };
    }
    return { valid: true, total_records: this.state.audit_chain.length };
  }

  public createCheckpoint(tenantId: string, targetMutation: string, classification: 'ATOMIC_DATABASE_RESTORE' | 'IRREVERSIBLE_EXTERNAL_ACTION' = 'ATOMIC_DATABASE_RESTORE'): CheckpointEntity {
    const id = `chk_${computeSha256(`${tenantId}:${targetMutation}:${Date.now()}`).slice(0, 18)}`;
    const checkpoint: CheckpointEntity = {
      id,
      checkpoint_id: id,
      tenant_id: tenantId,
      target_mutation: targetMutation,
      classification,
      // Checkpoints must not recursively snapshot the checkpoint registry itself.
      // Retain the current registry entry on rollback while keeping snapshots bounded.
      snapshot_state: JSON.parse(JSON.stringify({ ...this.state, checkpoints: {} })),
      timestamp: Date.now()
    };
    this.state.checkpoints[id] = checkpoint;
    this.sqlite.insertRecord('checkpoints', { ...checkpoint, status: 'SEALED' });
    this.persist();
    return checkpoint;
  }

  public rollbackToCheckpoint(checkpointId: string, reason: string): { success: boolean; error?: string } {
    const checkpoint = this.state.checkpoints[checkpointId];
    if (!checkpoint) return { success: false, error: `Checkpoint ${checkpointId} not found` };
    if (checkpoint.classification === 'IRREVERSIBLE_EXTERNAL_ACTION') {
      return { success: false, error: `Cannot rollback an IRREVERSIBLE_EXTERNAL_ACTION: ${reason}` };
    }
    if (!checkpoint.snapshot_state) return { success: false, error: 'Checkpoint snapshot is absent' };
    const preservedCheckpoints = this.state.checkpoints;
    this.state = JSON.parse(JSON.stringify(checkpoint.snapshot_state));
    this.state.checkpoints = preservedCheckpoints;
    this.appendAudit(checkpoint.tenant_id, 'ROLLBACK_GOVERNOR', 'ROLLBACK_EXECUTED', 'CHECKPOINT', checkpointId, { reason });
    return { success: true };
  }

  public persist(): void {
    this.sqlite.insertRecord('execution_runs', {
      id: this.snapshotId,
      tenant_id: 'SYSTEM',
      state: this.state,
      status: 'DURABLE_SNAPSHOT',
      version: '2.0.0'
    });
  }
}
