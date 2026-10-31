import { DatasetRegistry } from './DatasetRegistry';
import { HumanApprovalGate } from '../governance/HumanApprovalGate';
import type { UserContext } from '../auth/AuthService';

export interface CheckpointProvenance {
  id: string;
  parent_weight_sha256: string;
  dataset_id: string;
  dataset_version: string;
  dataset_sha256: string;
  trainer: string | null;
  checkpoint_sha256: string | null;
  produced_by_this_pipeline: false;
  ownership: 'not_transferred';
  status: 'UNDEPLOYED';
  note: string;
}

export class FineTunePipeline {
  private readonly checkpoints = new Map<string, CheckpointProvenance>();

  constructor(
    private readonly datasets: DatasetRegistry,
    private readonly approvals: HumanApprovalGate,
  ) {}

  public run(input: { parentWeightSha256: string; datasetId: string; datasetVersion: string }): {
    status: 'BLOCKED';
    checkpoint: null;
    reason: string;
  } {
    const dataset = this.datasets.get(input.datasetId, input.datasetVersion);
    if (!dataset || !dataset.sealed) {
      return { status: 'BLOCKED', checkpoint: null, reason: 'BLOCKED: fine-tune input must be a sealed dataset version.' };
    }
    if (!/^[a-f0-9]{64}$/.test(input.parentWeightSha256)) {
      return { status: 'BLOCKED', checkpoint: null, reason: 'BLOCKED: parent weight SHA-256 is required.' };
    }
    return {
      status: 'BLOCKED',
      checkpoint: null,
      reason: 'BLOCKED: no fine-tune trainer is configured. No checkpoint bytes were written.',
    };
  }

  public recordProvenance(input: {
    parentWeightSha256: string;
    datasetId: string;
    datasetVersion: string;
    trainer: string;
    checkpointSha256: string | null;
    producedByThisPipeline?: boolean;
  }): { ok: false; reason: string } | { ok: true; record: CheckpointProvenance } {
    if (input.producedByThisPipeline) {
      return { ok: false, reason: 'BLOCKED: this pipeline has not executed a trainer.' };
    }
    const dataset = this.datasets.get(input.datasetId, input.datasetVersion);
    if (!dataset || !dataset.sealed) return { ok: false, reason: 'BLOCKED: dataset version is not sealed.' };
    if (!/^[a-f0-9]{64}$/.test(input.parentWeightSha256)) return { ok: false, reason: 'BLOCKED: parent hash is invalid.' };
    if (!input.checkpointSha256 || !/^[a-f0-9]{64}$/.test(input.checkpointSha256)) {
      return { ok: false, reason: 'BLOCKED: a measured checkpoint hash is required. None was invented.' };
    }
    const id = `ckpt_${input.checkpointSha256.slice(0, 12)}`;
    const record: CheckpointProvenance = {
      id,
      parent_weight_sha256: input.parentWeightSha256,
      dataset_id: dataset.dataset_id,
      dataset_version: dataset.version,
      dataset_sha256: dataset.content_sha256,
      trainer: input.trainer,
      checkpoint_sha256: input.checkpointSha256,
      produced_by_this_pipeline: false,
      ownership: 'not_transferred',
      status: 'UNDEPLOYED',
      note: 'Provenance only. Open weights were not transferred to SOLVEX, and this pipeline did not train them.',
    };
    this.checkpoints.set(id, record);
    return { ok: true, record: { ...record } };
  }

  public deploy(id: string, user: UserContext | null): { deployed: false; reason: string } {
    const row = this.checkpoints.get(id);
    if (!row || !row.checkpoint_sha256) return { deployed: false, reason: 'BLOCKED: unknown checkpoint.' };
    const decision = this.approvals.assertDeployment(user, {
      kind: 'checkpoint',
      id: row.id,
      weightSha256: row.checkpoint_sha256,
    });
    if (!decision.ok) return { deployed: false, reason: decision.reason };
    return { deployed: false, reason: 'BLOCKED: checkpoint deployment is closed.' };
  }

  public list(): CheckpointProvenance[] {
    return [...this.checkpoints.values()].map((row) => ({ ...row }));
  }
}
