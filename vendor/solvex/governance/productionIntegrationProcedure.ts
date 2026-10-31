import { AuthService } from '../auth/AuthService';
import { productionIntegrationPermitted } from './HumanApprovalGate';
import type { GateDisposition } from './gateDisposition';

export interface IntegrationProcedureResult {
  procedure: 'PRODUCTION_INTEGRATION_V1';
  decision: 'REMAIN_CLOSED';
  opened: false;
  candidate_approval_counts_as_integration_auth: false;
  stages: Array<{ name: string; status: 'CHECKED' | 'DENIED' }>;
  reasons: string[];
}

/**
 * Candidate approval and production integration are different authorizations.
 * This procedure can deny integration. It cannot open the switch.
 */
export function runProductionIntegrationProcedure(input: {
  candidateEvidenceVerified: boolean;
  liveAuthorization: boolean;
  dispositions: GateDisposition[];
  operatorIntegrationSignature: string | null;
  signatureScope?: 'sandbox' | 'production' | null;
}): IntegrationProcedureResult {
  const reasons: string[] = [];
  const auth = AuthService.getInstance().authorize(null, 'open_production_integration');
  if (!auth.authorized) reasons.push(auth.reason);
  if (!productionIntegrationPermitted()) reasons.push('BLOCKED: the production integration switch is closed.');
  if (!input.operatorIntegrationSignature) reasons.push('BLOCKED: no separate operator signature authorizes production integration.');
  if (input.signatureScope === 'sandbox') reasons.push('BLOCKED: a sandbox rehearsal signature cannot open production integration.');
  if (input.candidateEvidenceVerified) reasons.push('A preserved candidate approval is not production authorization.');
  if (!input.liveAuthorization) reasons.push('BLOCKED: there is no live human authorization to integrate.');
  const unresolved = input.dispositions.filter((gate) => gate.observed_status !== 'PASSED');
  if (unresolved.length > 0) {
    reasons.push(`BLOCKED: ${unresolved.map((gate) => gate.id).join(', ')} are not passed.`);
  }
  return {
    procedure: 'PRODUCTION_INTEGRATION_V1',
    decision: 'REMAIN_CLOSED',
    opened: false,
    candidate_approval_counts_as_integration_auth: false,
    stages: [
      { name: 'CANDIDATE_EVIDENCE', status: 'CHECKED' },
      { name: 'SEPARATE_OPERATOR_AUTHORIZATION', status: 'DENIED' },
      { name: 'GATE_DISPOSITION', status: 'CHECKED' },
      { name: 'OPEN_PRODUCTION', status: 'DENIED' },
    ],
    reasons,
  };
}
