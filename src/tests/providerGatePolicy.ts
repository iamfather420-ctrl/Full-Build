export type ProviderGateStatus = 'PASSED' | 'FAILED' | 'BLOCKED' | 'EXTERNAL_PROVIDER_REQUIRED';
export interface ProviderGateInputs {
  paymentsEnabled: boolean;
  paypalEvidencePresent: boolean;
  paypalEvidenceShapeValid: boolean;
  paypalEvidenceFresh: boolean;
  hasNeon: boolean;
  neonConnected: boolean;
}
/** Payments-disabled verification does not require PayPal OAuth; supplied evidence is still rejected if invalid or stale. */
export function evaluateProviderGateStatus(input: ProviderGateInputs): ProviderGateStatus {
  if (input.paypalEvidencePresent && !input.paypalEvidenceShapeValid) return 'FAILED';
  if (input.paypalEvidencePresent && !input.paypalEvidenceFresh) return 'BLOCKED';
  if (input.hasNeon && !input.neonConnected) return 'FAILED';
  if (input.paymentsEnabled) return 'EXTERNAL_PROVIDER_REQUIRED';
  if (input.hasNeon && input.neonConnected) return 'PASSED';
  return 'EXTERNAL_PROVIDER_REQUIRED';
}
