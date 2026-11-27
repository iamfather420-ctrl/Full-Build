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

type AuditChainVerification = {
  valid: boolean;
  total_records: number;
  source: 'SQLITE' | 'MEMORY';
  durable: boolean;
  signed: false;
  reason?: string;
};

export class DurableStore {
  private static instance: DurableStore | null = null;
  private state: DurableState;
  private readonly STORAGE_KEY = 'SOLVEX_SOVEREIGN_DURABLE_STATE';

  private constructor() {
    this.state = {
      tenants: {}, problems: {}, solutions: {}, offers: {}, proof_bundles: {},
      audit_chain: [], checkpoints: {}
    };
    this.load();
    const sqlite = SqliteStore.getInstance();
    const persisted = sqlite.findAllRecords<AuditRecordEntity>('audit_records')
      .sort((a, b) => a.index_num - b.index_num);
    if (persisted.length > 0 && this.state.audit_chain.length === 0) {
      this.state.audit_chain = persisted;
    } else if (persisted.length === 0 && this.state.audit_chain.length > 0) {
      // Migrate existing browser-persisted records into the SQLite wrapper once;
      // verifyChain will still validate every imported hash before appending.
      for (const record of this.state.audit_chain.slice().sort((a, b) => a.index_num - b.index_num)) {
        sqlite.insertTenantRecord('audit_records', record.tenant_id, record as unknown as Record<string, any>);
      }
    }
  }

  public static getInstance(): DurableStore {
    if (!DurableStore.instance) DurableStore.instance = new DurableStore();
    return DurableStore.instance;
  }

  public getState(): DurableState { return this.state; }

  public appendAudit(
    tenantId: string, actor: string, action: string,
    targetEntity: string, targetId: string, payload: any
  ): AuditRecordEntity {
    const sqlite = SqliteStore.getInstance();
    const persisted = sqlite.findAllRecords<AuditRecordEntity>('audit_records')
      .sort((a, b) => a.index_num - b.index_num);
    const chain = persisted.length > 0 ? persisted : this.state.audit_chain;
    const existing = this.verifyChain();
    if (!existing.valid) throw new Error('Cannot append to an invalid audit hash chain: ' + (existing.reason || 'integrity failure'));

    const timestamp = Date.now();
    const indexNum = chain.length;
    const previousHash = indexNum > 0 ? chain[indexNum - 1].record_hash : '0'.repeat(64);
    const payloadHash = computeSha256(JSON.stringify(payload));
    const recordHash = computeSha256(
      `${indexNum}:${timestamp}:${tenantId}:${actor}:${action}:${targetEntity}:${targetId}:${previousHash}:${payloadHash}`
    );
    const record: AuditRecordEntity = {
      id: `audit_${timestamp}_${indexNum}`, tenant_id: tenantId, index_num: indexNum,
      timestamp, actor, action, target_entity: targetEntity, target_id: targetId,
      payload, payload_hash: payloadHash, previous_hash: previousHash, record_hash: recordHash
    };

    // Append to SQLite before acknowledging. This is a linear hash chain, not a Merkle tree or signed ledger.
    sqlite.insertTenantRecord('audit_records', tenantId, {
      id: record.id, index_num: record.index_num, timestamp: record.timestamp,
      actor: record.actor, action: record.action, target_entity: record.target_entity,
      target_id: record.target_id, payload: record.payload, payload_hash: record.payload_hash,
      previous_hash: record.previous_hash, record_hash: record.record_hash
    });
    this.state.audit_chain = [...chain, record];
    this.persist();
    return record;
  }

  public verifyChain(): AuditChainVerification {
    const sqlite = SqliteStore.getInstance();
    const persisted = sqlite.findAllRecords<AuditRecordEntity>('audit_records')
      .sort((a, b) => a.index_num - b.index_num);
    const source: 'SQLITE' | 'MEMORY' = persisted.length > 0 ? 'SQLITE' : 'MEMORY';
    const chain = persisted.length > 0 ? persisted : this.state.audit_chain;
    const base = { total_records: chain.length, source, durable: sqlite.isDiskBacked(), signed: false as const };

    if (persisted.length > 0 && this.state.audit_chain.length > 0) {
      if (persisted.length !== this.state.audit_chain.length) {
        return { valid: false, ...base, reason: 'Persisted and in-memory audit chain lengths differ' };
      }
      for (let i = 0; i < persisted.length; i++) {
        const dbRecord = persisted[i];
        const memoryRecord = this.state.audit_chain[i];
        if (dbRecord.id !== memoryRecord.id ||
            dbRecord.payload_hash !== memoryRecord.payload_hash ||
            dbRecord.previous_hash !== memoryRecord.previous_hash ||
            dbRecord.record_hash !== memoryRecord.record_hash) {
          return { valid: false, ...base, reason: `Persisted/in-memory audit record divergence at index ${i}` };
        }
      }
    }

    for (let i = 0; i < chain.length; i++) {
      const rec = chain[i];
      if (rec.index_num !== i) {
        return { valid: false, ...base, reason: `Non-sequential audit index at position ${i}` };
      }
      const expectedPrevious = i > 0 ? chain[i - 1].record_hash : '0'.repeat(64);
      if (rec.previous_hash !== expectedPrevious) {
        return { valid: false, ...base, reason: `Broken previous-hash link at index ${i}` };
      }
      const expectedPayloadHash = computeSha256(JSON.stringify(rec.payload));
      if (rec.payload_hash !== expectedPayloadHash) {
        return { valid: false, ...base, reason: `Payload tamper detected at index ${i}` };
      }
      const expectedRecordHash = computeSha256(
        `${rec.index_num}:${rec.timestamp}:${rec.tenant_id}:${rec.actor}:${rec.action}:${rec.target_entity}:${rec.target_id}:${rec.previous_hash}:${rec.payload_hash}`
      );
      if (rec.record_hash !== expectedRecordHash) {
        return { valid: false, ...base, reason: `Record hash mismatch at index ${i}` };
      }
    }
    return { valid: true, ...base };
  }

  public createCheckpoint(
    tenantId: string, targetMutation: string,
    classification: 'ATOMIC_DATABASE_RESTORE' | 'IRREVERSIBLE_EXTERNAL_ACTION' = 'ATOMIC_DATABASE_RESTORE'
  ): CheckpointEntity {
    const id = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const checkpoint: CheckpointEntity = {
      id, checkpoint_id: id, tenant_id: tenantId, target_mutation: targetMutation, classification,
      snapshot_state: JSON.parse(JSON.stringify({
        problems: this.state.problems, solutions: this.state.solutions,
        offers: this.state.offers, tenants: this.state.tenants
      })),
      timestamp: Date.now()
    };
    this.state.checkpoints[id] = checkpoint;
    this.persist();
    return checkpoint;
  }

  public rollbackToCheckpoint(checkpointId: string, reason: string): { success: boolean; error?: string } {
    const chk = this.state.checkpoints[checkpointId];
    if (!chk) return { success: false, error: `Checkpoint ${checkpointId} not found` };
    if (chk.classification === 'IRREVERSIBLE_EXTERNAL_ACTION') {
      return { success: false, error: `Cannot rollback checkpoint marked IRREVERSIBLE_EXTERNAL_ACTION. Reversibility guarantee rejected: ${reason}` };
    }
    if (chk.snapshot_state) {
      this.state.problems = JSON.parse(JSON.stringify(chk.snapshot_state.problems || {}));
      this.state.solutions = JSON.parse(JSON.stringify(chk.snapshot_state.solutions || {}));
      this.state.offers = JSON.parse(JSON.stringify(chk.snapshot_state.offers || {}));
      this.state.tenants = JSON.parse(JSON.stringify(chk.snapshot_state.tenants || {}));
      this.persist();
      return { success: true };
    }
    return { success: false, error: 'Snapshot state missing from checkpoint' };
  }

  private load(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) this.state = { ...this.state, ...parsed };
        }
      } catch {}
    }
  }

  public persist(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state)); } catch {}
    }
  }
}
