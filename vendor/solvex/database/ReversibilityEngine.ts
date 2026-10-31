import { DurableStore } from './DurableStore';
import { SqliteStore } from './SqliteStore';
import { computeSha256 } from './DatabaseSchema';

export interface DiversionResult {
  fail_closed_enforced: boolean;
  rollback_status: 'ROLLED_BACK' | 'FAILED' | 'REJECTED';
  failure_id: string;
  evidence_hash: string;
}

export class ReversibilityEngine {
  private static instance: ReversibilityEngine | null = null;
  private durableStore: DurableStore;
  private sqlite: SqliteStore;

  private constructor() {
    this.durableStore = DurableStore.getInstance();
    this.sqlite = SqliteStore.getInstance();
  }

  public static getInstance(): ReversibilityEngine {
    if (!ReversibilityEngine.instance) {
      ReversibilityEngine.instance = new ReversibilityEngine();
    }
    return ReversibilityEngine.instance;
  }

  public createCheckpoint(
    tenantId: string,
    targetMutation: string,
    classification: 'ATOMIC_DATABASE_RESTORE' | 'IRREVERSIBLE_EXTERNAL_ACTION' = 'ATOMIC_DATABASE_RESTORE'
  ) {
    const chk = this.durableStore.createCheckpoint(tenantId, targetMutation, classification);
    try {
      this.sqlite.insertRecord('checkpoints', {
        id: chk.id,
        tenant_id: tenantId,
        target_mutation: targetMutation,
        classification,
        snapshot_hash: computeSha256(JSON.stringify(chk.snapshot_state)),
        status: 'ACTIVE'
      });
    } catch {}
    return chk;
  }

  public executeRollback(checkpointId: string, reason: string): { success: boolean; error?: string } {
    return this.durableStore.rollbackToCheckpoint(checkpointId, reason);
  }

  public divertFailure(
    failedGate: string,
    triggerReason: string,
    tenantId: string,
    executionId: string,
    checkpointId?: string,
    evidencePayload?: any
  ): DiversionResult {
    const failureId = `fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const evidenceHash = computeSha256(JSON.stringify(evidencePayload || { failedGate, triggerReason, executionId }));
    let rollbackStatus: 'ROLLED_BACK' | 'FAILED' | 'REJECTED' = 'ROLLED_BACK';

    if (checkpointId) {
      const rollback = this.executeRollback(checkpointId, `Automatic fail-closed diversion: ${triggerReason}`);
      if (!rollback.success) {
        rollbackStatus = 'FAILED';
      }
    }

    try {
      this.sqlite.insertRecord('failures', {
        id: failureId,
        tenant_id: tenantId,
        failed_gate: failedGate,
        trigger_reason: triggerReason,
        evidence_hash: evidenceHash,
        reverted_to_checkpoint: checkpointId || null,
        fail_closed_enforced: 1,
        status: 'QUARANTINED'
      });
    } catch {}

    this.durableStore.appendAudit(
      tenantId,
      'FAIL_CLOSED_SENTINEL',
      'FAILURE_DIVERSION',
      'FAILURE',
      failureId,
      { failedGate, triggerReason, rollbackStatus, evidenceHash }
    );

    return {
      fail_closed_enforced: true,
      rollback_status: rollbackStatus,
      failure_id: failureId,
      evidence_hash: evidenceHash
    };
  }
}
