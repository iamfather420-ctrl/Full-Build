export interface ActivationGateInputs {
  corpusPassed: boolean;
  adversarialPassed: boolean;
  observedGateCount: number;
  requiredGateCount: number;
  nonPassedGateCount: number;
}

/**
 * Fail closed unless every required activation condition is satisfied.
 * Pure function so it can be regression-tested without running Z3.
 */
export function isBrainActivationAllowed(input: ActivationGateInputs): boolean {
  return (
    input.corpusPassed &&
    input.adversarialPassed &&
    input.observedGateCount === input.requiredGateCount &&
    input.requiredGateCount === 46 &&
    input.nonPassedGateCount === 0
  );
}
