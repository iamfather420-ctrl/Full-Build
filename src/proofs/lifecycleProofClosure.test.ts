import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateLifecycleProofClosure, type LifecycleGate } from './lifecycleProofClosure.ts';

const transitions = ['ORDER_CREATED', 'ESCROW_FUNDED', 'SANDBOX_PROVISIONED', 'REPLAY_VERIFIED', 'DEPLOYED'];

function gates(overrides: {
  gate12Status?: string;
  gate14Status?: string;
  stage14Status?: string;
  paymentProcessing?: string;
  finalStatus?: string;
  testScope?: string;
  identityResolution?: string;
  authorizationBlocked?: boolean;
  transitionsExecuted?: string[];
  transitionAttempts?: Array<{ target_state: string; success: boolean }>;
  pipelineSuccess?: boolean;
} = {}): LifecycleGate[] {
  const stage14Status = overrides.stage14Status ?? 'BLOCKED';
  return [
    {
      gate_id: 'GATE-12',
      status: overrides.gate12Status ?? 'BLOCKED',
      details: {
        identity_resolution: overrides.identityResolution ?? 'VERIFIED_DISPOSABLE_NEON_IDENTITY',
        solution_pipeline: {
          success: overrides.pipelineSuccess ?? stage14Status === 'PASSED',
          stage_traces: [{ stage: 14, status: stage14Status }]
        },
        order_lifecycle: {
          order_id: 'e2e_order_fixture',
          test_scope: overrides.testScope ?? 'DISPOSABLE_NEON_TEST_ONLY',
          final_status: overrides.finalStatus ?? 'DEPLOYED',
          authorization_blocked: overrides.authorizationBlocked ?? false,
          payment_processing: overrides.paymentProcessing ?? 'DISABLED',
          transitions_executed: overrides.transitionsExecuted ?? transitions,
          transition_attempts: overrides.transitionAttempts ?? transitions.map(target_state => ({ target_state, success: true }))
        }
      }
    },
    { gate_id: 'GATE-14', status: overrides.gate14Status ?? 'BLOCKED' }
  ];
}

test('accepts completed disposable Neon lifecycle while Stage 14 and GATE-14 remain blocked', () => {
  const result = evaluateLifecycleProofClosure(gates());
  assert.equal(result.valid, true);
  assert.equal(result.path, 'DISPOSABLE_NEON_TEST');
});

test('accepts safely blocked OFFER lifecycle without transitions', () => {
  const result = evaluateLifecycleProofClosure(gates({
    finalStatus: 'OFFER',
    authorizationBlocked: true,
    transitionsExecuted: [],
    transitionAttempts: [],
    testScope: 'DISPOSABLE_NEON_TEST_ONLY'
  }));
  assert.equal(result.valid, true);
  assert.equal(result.path, 'SAFE_BLOCKED_OFFER');
});

test('accepts completed disposable lifecycle when Stage 14 passed but production GATE-14 remains blocked', () => {
  const result = evaluateLifecycleProofClosure(gates({
    gate12Status: 'PASSED',
    stage14Status: 'PASSED',
    pipelineSuccess: true
  }));
  assert.equal(result.valid, true);
  assert.equal(result.path, 'DISPOSABLE_NEON_TEST');
});

test('rejects lifecycle status that contradicts Stage 14', () => {
  const result = evaluateLifecycleProofClosure(gates({ gate12Status: 'PASSED', stage14Status: 'BLOCKED', pipelineSuccess: false }));
  assert.equal(result.valid, false);
  assert.equal(result.path, 'INVALID');
});

test('rejects any lifecycle proof that enables payment processing or unblocks production GATE-14', () => {
  assert.equal(evaluateLifecycleProofClosure(gates({ paymentProcessing: 'ENABLED' })).valid, false);
  assert.equal(evaluateLifecycleProofClosure(gates({ gate14Status: 'PASSED' })).valid, false);
});

test('rejects incomplete or falsely successful disposable transitions', () => {
  assert.equal(evaluateLifecycleProofClosure(gates({ transitionsExecuted: transitions.slice(0, 4) })).valid, false);
  const failedAttempt = transitions.map(target_state => ({ target_state, success: true }));
  failedAttempt[4] = { target_state: 'DEPLOYED', success: false };
  assert.equal(evaluateLifecycleProofClosure(gates({ transitionAttempts: failedAttempt })).valid, false);
});
