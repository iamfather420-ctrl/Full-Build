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
  // DN-05 must not be promoted to success when its source-bound proof bundle
  // fails strict integrity verification. The current fixture is fail-closed;
  // provider-required is reserved for a bundle whose other integrity checks pass.
  assert.equal(report.results.find((node) => node.node_id === 'DN-05')?.status, 'FAIL_CLOSED');
  for (const nodeId of ['DN-11', 'DN-29']) {
    assert.equal(report.results.find((node) => node.node_id === nodeId)?.status, 'PROVIDER_REQUIRED',
      nodeId + ' must remain explicitly provider-required until independent oracle trust is available');
  }
});
