import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DaisySubsystemExecutors } from './DaisySubsystemExecutors.ts';

test('every canonical node is executed and fiat settlement stays prohibited', async () => {
  const report = await new DaisySubsystemExecutors().executeAll54Nodes();
  const ids = report.results.map((node) => node.node_id);
  assert.deepEqual(ids, Array.from({ length: 54 }, (_, index) => `DN-${String(index + 1).padStart(2, '0')}`));
  assert.equal(report.total, 54);
  assert.equal(report.success + report.fail_closed + report.provider_required + report.prohibited_blocked, 54);
  assert.equal(report.results.find((node) => node.node_id === 'DN-36')?.status, 'PROHIBITED_BLOCKED');
  assert.equal(report.results.find((node) => node.node_id === 'DN-01')?.status, 'SUCCESS');
  assert.equal(report.results.find((node) => node.node_id === 'DN-54')?.status, 'SUCCESS');
  const dn06 = report.results.find((node) => node.node_id === 'DN-06');
  assert.equal(dn06?.evidence.ledger_type, 'LINEAR_HASH_CHAIN_NOT_MERKLE');
  assert.equal(dn06?.evidence.signed, false);
  const dn11 = report.results.find((node) => node.node_id === 'DN-11');
  assert.equal(dn11?.status, 'PROVIDER_REQUIRED',
    'the local pipeline must run and preserve its external-oracle boundary without making a third-party AI call');
  assert.equal(dn11?.evidence.external_provider_required, true);
  const dn05 = report.results.find((node) => node.node_id === 'DN-05');
  assert.equal(dn05?.status, 'PROVIDER_REQUIRED',
    'missing independent oracle trust must remain provider-required, never a false verification or generic failure');
  assert.equal(dn05?.evidence.proof_integrity_verified, false);
  assert.equal(dn05?.evidence.public_audit_token_present, false);
  const dn29 = report.results.find((node) => node.node_id === 'DN-29');
  assert.equal(dn29?.status, 'PROVIDER_REQUIRED',
    'the dependent solution must remain provider-required until the independent oracle trust root exists');
  const dn07 = report.results.find((node) => node.node_id === 'DN-07');
  assert.equal(dn07?.status, 'PROVIDER_REQUIRED',
    'local tamper detection must not be represented as cross-restart durability');
  assert.equal(dn07?.evidence.durable_across_restart_verified, false);
  assert.equal(dn07?.evidence.persistence_provider_required, true);
});
