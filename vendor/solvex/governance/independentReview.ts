import type { CapabilityRegistry } from '../capabilities/CapabilityRegistry';
import type { ProcedureStore } from '../knowledge/ProcedureStore';
import type { DatasetRegistry } from '../training/DatasetRegistry';
import type { FineTunePipeline } from '../training/FineTunePipeline';
import { computeSha256 } from '../database/DatabaseSchema';

export interface ReviewFinding {
  code: string;
  detail: string;
}

/** A second pass over stored bytes. It does not trust a validated or deployed flag by itself. */
export function independentReview(input: {
  capabilities: CapabilityRegistry;
  procedures: ProcedureStore;
  datasets: DatasetVersionView[];
  checkpoints: FineTunePipeline;
}): { ok: boolean; findings: ReviewFinding[] } {
  const findings: ReviewFinding[] = [];
  for (const capability of input.capabilities.list()) {
    if (capability.status === 'DEPLOYED' || capability.executable || capability.authority !== 'none') {
      findings.push({ code: 'CAPABILITY_DEPLOYED', detail: capability.id });
    }
  }
  for (const procedure of input.procedures.list()) {
    if (computeSha256(procedure.body) !== procedure.content_sha256) {
      findings.push({ code: 'PROCEDURE_HASH_MISMATCH', detail: procedure.id });
    }
    if (procedure.executable) findings.push({ code: 'PROCEDURE_EXECUTABLE', detail: procedure.id });
    if (procedure.validated && procedure.kind !== 'VALIDATED_PROCEDURE') {
      findings.push({ code: 'FALSE_VALIDATION', detail: procedure.id });
    }
  }
  for (const dataset of input.datasets) {
    if (computeSha256(dataset.body) !== dataset.content_sha256) {
      findings.push({ code: 'DATASET_HASH_MISMATCH', detail: `${dataset.dataset_id}@${dataset.version}` });
    }
  }
  for (const checkpoint of input.checkpoints.list()) {
    if (checkpoint.status !== 'UNDEPLOYED' || checkpoint.produced_by_this_pipeline || checkpoint.ownership !== 'not_transferred') {
      findings.push({ code: 'CHECKPOINT_NOT_PROVENANCE_ONLY', detail: checkpoint.id });
    }
  }
  return { ok: findings.length === 0, findings };
}

export interface DatasetVersionView {
  dataset_id: string;
  version: string;
  body: string;
  content_sha256: string;
}
