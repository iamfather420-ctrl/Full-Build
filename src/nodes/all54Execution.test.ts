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
  const dn07 = report.results.find((node) => node.node_id === 'DN-07');
  assert.equal(dn07?.status, 'PROVIDER_REQUIRED',
    'local tamper detection must not be represented as cross-restart durability');
  assert.equal(dn07?.evidence.durable_across_restart_verified, false);
  assert.equal(dn07?.evidence.persistence_provider_required, true);
});
