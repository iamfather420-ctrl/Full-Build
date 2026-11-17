import type { SubsystemExecutionResult } from './DaisySubsystemExecutors.ts';

export type NodeVerdict =
  | 'FUNCTIONALLY_PASSED'
  | 'SAFETY_PASSED'
  | 'PROVIDER_REQUIRED'
  | 'PROHIBITED_BY_POLICY'
  | 'NOT_VERIFIED';

const MISSING_IMPLEMENTATION = /not installed|not wired|does not|No [A-Z]|No canonical|No independent|No escrow|No distributed|No Raft|No trusted|No HSM|No Ed25519|No commitment|No problem-specific/i;

/** Classify one node result. SUCCESS is not invented, and a safety refusal is not relabeled as functional success. */
export function classifyNodeResult(result: Pick<SubsystemExecutionResult, 'status' | 'evidence'>): NodeVerdict {
  if (result.status === 'PROHIBITED_BLOCKED') return 'PROHIBITED_BY_POLICY';
  if (result.status === 'PROVIDER_REQUIRED') return 'PROVIDER_REQUIRED';
  if (result.status === 'SUCCESS') return 'FUNCTIONALLY_PASSED';
  const evidence = JSON.stringify(result.evidence ?? {});
  if (result.status === 'FAIL_CLOSED' && !MISSING_IMPLEMENTATION.test(evidence) && /blocked|rejected|disabled|fail_closed_enforced|unauthenticated/i.test(evidence)) {
    return 'SAFETY_PASSED';
  }
  return 'NOT_VERIFIED';
}
