export interface ActivationGateInputs {
  corpusPassed: boolean;
  adversarialPassed: boolean;
  observedGateCount: number;
  requiredGateCount: number;
  nonPassedGateCount: number;
}

/**
 * Fail closed unless every required activation condition is satisfied.
 * This decision is deliberately pure so it can be regression-tested without
 * executing the expensive Z3 corpus or touching production resources.
 */
export function isBrainActivationAllowed(input: ActivationGateInputs): boolean {
  return input.corpusPassed &&
    input.adversarialPassed &&
    input.observedGateCount === input.requiredGateCount &&
    input.requiredGateCount === 46 &&
    input.nonPassedGateCount === 0;
}
