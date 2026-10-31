import type { EvidenceValidation } from '../governance/humanRootEvidence';
import type { IntegrationProcedureResult } from '../governance/productionIntegrationProcedure';

export interface AuthorizedContinuation {
  lifecycle_complete: false;
  production_ready: false;
  bypassed_governance: false;
  stopped_at: 'AUTHORIZATION';
  stages: Array<{ name: string; status: 'COMPLETED' | 'BLOCKED' | 'NOT_RUN'; detail: string }>;
}

/** Advances only the stages that preserved evidence can support. It does not authorize or deploy. */
export function continueAuthorizedStages(
  validation: EvidenceValidation,
  integration: IntegrationProcedureResult,
): AuthorizedContinuation {
  const verified = validation.ok && validation.source_matches;
  return {
    lifecycle_complete: false,
    production_ready: false,
    bypassed_governance: false,
    stopped_at: 'AUTHORIZATION',
    stages: [
      { name: 'DISCOVER', status: verified ? 'COMPLETED' : 'BLOCKED', detail: 'The missing capability remains the gap classifier.' },
      { name: 'DEVELOP', status: verified ? 'COMPLETED' : 'BLOCKED', detail: 'The sandbox source hash still matches the preserved candidate.' },
      { name: 'VERIFY', status: verified ? 'COMPLETED' : 'BLOCKED', detail: 'Independent evidence validation recomputed the fingerprint and source hash.' },
      {
        name: 'AUTHORIZE',
        status: 'BLOCKED',
        detail: 'Historical evidence is not a live signature. The private key was destroyed and the signed tokens were not retained.',
      },
      { name: 'INTEGRATION_REVIEW', status: integration.opened ? 'BLOCKED' : 'COMPLETED', detail: integration.decision },
      { name: 'DEPLOY', status: 'NOT_RUN', detail: 'Deployment was not attempted from this continuation.' },
    ],
  };
}
