import { REAL_88_PARADOX_REGISTRY, DFRLParadoxItem, ModelClassification, ModelScope } from '../data/paradoxData';
import { computeSha256 } from '../database/DatabaseSchema';

export interface DFRLVerificationResult {
  operator_id: string;
  code?: string;
  operator_name: string;
  name?: string;
  model_classification: ModelClassification;
  model_scope: ModelScope;
  domain: string;
  category: string;
  assertion: string;
  assertion_hash: string;
  actual_smt_assertion_hash: string;
  solver_version: string;
  execution_id: string;
  solver_result: 'unsat' | 'sat' | 'unknown' | 'error' | 'formal_execution_not_performed';
  expected_solver_result: 'unsat' | 'sat';
  sat_witness_recheck_passed?: boolean;
  sat_witness_model_sha256?: string;
  proved: boolean;
  claim_scope: 'MODEL_VERIFIED';
  execution_duration_ms: number;
  duration_ms?: number;
  error?: string;
  certificate_sha256: string;
  timestamp: string;
}
