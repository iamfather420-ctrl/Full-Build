export type LifecycleGate = { gate_id: string; status: string; details?: any };

export type LifecycleProofDecision = {
  valid: boolean;
  path: 'SAFE_BLOCKED_OFFER' | 'DISPOSABLE_NEON_TEST' | 'INVALID';
  reason: string;
};

const EXPECTED_TRANSITIONS = [
  'ORDER_CREATED',
  'ESCROW_FUNDED',
  'SANDBOX_PROVISIONED',
  'REPLAY_VERIFIED',
  'DEPLOYED'
] as const;

export function evaluateLifecycleProofClosure(gates: LifecycleGate[]): LifecycleProofDecision {
  const gate12 = gates.find((gate) => gate.gate_id === 'GATE-12');
  const gate14 = gates.find((gate) => gate.gate_id === 'GATE-14');
  const lifecycle = gate12?.details?.order_lifecycle ?? {};
  const pipeline = gate12?.details?.solution_pipeline ?? {};
  const stage14 = pipeline.stage_traces?.find((stage: any) => stage.stage === 14);

  if (!gate12 || !gate14) {
    return { valid: false, path: 'INVALID', reason: 'GATE-12 or GATE-14 evidence is missing.' };
  }
  if (gate14.status !== 'BLOCKED') {
    return { valid: false, path: 'INVALID', reason: 'Production GATE-14 must remain BLOCKED for this non-production proof.' };
  }
  if (lifecycle.payment_processing !== 'DISABLED') {
    return { valid: false, path: 'INVALID', reason: 'Payment processing must remain DISABLED.' };
  }

  const safeBlockedOffer =
    gate12.status === 'BLOCKED' &&
    lifecycle.final_status === 'OFFER' &&
    Array.isArray(lifecycle.transitions_executed) &&
    lifecycle.transitions_executed.length === 0 &&
    lifecycle.authorization_blocked === true;

  if (safeBlockedOffer) {
    return { valid: true, path: 'SAFE_BLOCKED_OFFER', reason: 'Lifecycle safely remains at OFFER with authorization blocked.' };
  }

  const attempts = lifecycle.transition_attempts;
  const executed = lifecycle.transitions_executed;
  const disposableLifecycleCompleted =
    lifecycle.test_scope === 'DISPOSABLE_NEON_TEST_ONLY' &&
    gate12.details?.identity_resolution === 'VERIFIED_DISPOSABLE_NEON_IDENTITY' &&
    typeof lifecycle.order_id === 'string' &&
    lifecycle.order_id.startsWith('e2e_order_') &&
    lifecycle.final_status === 'DEPLOYED' &&
    Array.isArray(executed) &&
    executed.length === EXPECTED_TRANSITIONS.length &&
    EXPECTED_TRANSITIONS.every((state, index) => executed[index] === state) &&
    Array.isArray(attempts) &&
    attempts.length === EXPECTED_TRANSITIONS.length &&
    attempts.every((attempt: any, index: number) =>
      attempt?.target_state === EXPECTED_TRANSITIONS[index] && attempt.success === true
    ) &&
    lifecycle.authorization_blocked === false &&
    ['PASSED', 'BLOCKED'].includes(stage14?.status) &&
    pipeline.success === (stage14.status === 'PASSED') &&
    gate12.status === (stage14.status === 'BLOCKED' ? 'BLOCKED' : 'PASSED');

  if (disposableLifecycleCompleted) {
    return {
      valid: true,
      path: 'DISPOSABLE_NEON_TEST',
      reason: stage14.status === 'BLOCKED'
        ? 'Disposable Neon lifecycle completed; Stage 14 and production GATE-14 remain blocked.'
        : 'Disposable Neon lifecycle completed; production GATE-14 remains blocked.'
    };
  }

  return {
    valid: false,
    path: 'INVALID',
    reason: 'Lifecycle evidence matches neither a safely blocked OFFER nor a fully evidenced disposable Neon test with a consistent Stage 14 status.'
  };
}
