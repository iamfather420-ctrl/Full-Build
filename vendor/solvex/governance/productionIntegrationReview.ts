import { AuthService } from '../auth/AuthService';
import { productionIntegrationPermitted } from './HumanApprovalGate';

export interface IntegrationReview {
  decision: 'REMAIN_CLOSED';
  open: false;
  reasons: string[];
}

/**
 * A separate decision from candidate approval. This review cannot open the
 * production switch. Opening integration requires a later, explicit change.
 */
export function reviewProductionIntegration(operatorAuthorization: { signature: string } | null): IntegrationReview {
  const reasons: string[] = [];
  const auth = AuthService.getInstance().authorize(null, 'open_production_integration');
  if (!auth.authorized) reasons.push(auth.reason);
  if (!productionIntegrationPermitted()) reasons.push('BLOCKED: the production integration switch is closed.');
  if (!operatorAuthorization?.signature) {
    reasons.push('BLOCKED: no separate operator authorization to open production integration was provided.');
  }
  return { decision: 'REMAIN_CLOSED', open: false, reasons };
}
