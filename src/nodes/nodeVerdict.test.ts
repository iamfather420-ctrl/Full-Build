import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyNodeResult } from './nodeVerdict.ts';

function node(node_id: string, status: string, evidence: Record<string, unknown> = {}) {
  return { node_id, status, evidence } as any;
}

test('functional success requires an explicit successful execution result', () => {
  assert.equal(classifyNodeResult(node('DN-03', 'SUCCESS', { solver_result: 'unsat', proved: true })), 'FUNCTIONALLY_PASSED');
  assert.equal(classifyNodeResult(node('DN-03', 'FAIL_CLOSED', { solver_result: 'unknown' })), 'NOT_VERIFIED');
});

test('fail-closed security controls count only when their rejection evidence is explicit', () => {
  assert.equal(classifyNodeResult(node('DN-16', 'FAIL_CLOSED', {
    local_token_mint_blocked: true,
    untrusted_token_rejected: true,
    authorization_mode: 'TRUSTED_OIDC_REQUIRED'
  })), 'SAFETY_PASSED');
  assert.equal(classifyNodeResult(node('DN-16', 'FAIL_CLOSED', {
    local_token_mint_blocked: false,
    untrusted_token_rejected: true,
    reason: 'No trusted identity provider configured'
  })), 'NOT_VERIFIED');
});

test('provider dependencies and prohibited policy interlocks are not functional passes', () => {
  assert.equal(classifyNodeResult(node('DN-37', 'PROVIDER_REQUIRED', {
    configuration_present: false,
    provider_authenticated: false,
    fail_closed: true
  })), 'PROVIDER_REQUIRED');
  assert.equal(classifyNodeResult(node('DN-36', 'PROHIBITED_BLOCKED', {
    directive: 'SOVEREIGN_DIRECTIVE_PAYPAL_EXCLUSIVE',
    enforced: true,
    unapproved_payment_blocked: true
  })), 'PROHIBITED_BY_POLICY');
});

test('incomplete pipeline and missing source-bound proof remain unverified', () => {
  assert.equal(classifyNodeResult(node('DN-11', 'FAIL_CLOSED', {
    external_probe_enabled: false,
    reason: 'Independent provider attestation is required'
  })), 'NOT_VERIFIED');
  assert.equal(classifyNodeResult(node('DN-29', 'FAIL_CLOSED', {
    status: 'MISSING',
    proof_bundle_integrity_verified: false,
    reasons: ['No proof bundle is attached to DH-S-001.']
  })), 'NOT_VERIFIED');
});

test('production signing and HSM capabilities remain provider-required until attested', () => {
  for (const id of ['DN-49', 'DN-51', 'DN-52']) {
    assert.equal(classifyNodeResult(node(id, 'PROVIDER_REQUIRED', {
      external_provider_required: true,
      production_attestation_verified: false
    })), 'PROVIDER_REQUIRED');
  }
});
