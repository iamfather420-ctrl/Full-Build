import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runDaisy54NodeCoverage } from '../tests/daisy54NodeCoverage.ts';
import { classifyNodeResult, type NodeVerdict } from './nodeVerdict.ts';

test('54-node coverage can pass while functional success stays below 54', async () => {
  const coverage = await runDaisy54NodeCoverage();
  const verdicts = coverage.results.map((result) => ({ id: result.node_id, status: result.status, verdict: classifyNodeResult(result) }));
  const counts = verdicts.reduce<Record<NodeVerdict, number>>((total, row) => {
    total[row.verdict] += 1;
    return total;
  }, { FUNCTIONALLY_PASSED: 0, SAFETY_PASSED: 0, PROVIDER_REQUIRED: 0, PROHIBITED_BY_POLICY: 0, NOT_VERIFIED: 0 });
  assert.equal(coverage.results.length, 54);
  assert.equal(coverage.execution_complete, true);
  assert.equal(coverage.all_passed, false);
  assert.equal(coverage.verdict_counts.FUNCTIONALLY_PASSED + coverage.verdict_counts.SAFETY_PASSED + coverage.verdict_counts.PROHIBITED_BY_POLICY + coverage.verdict_counts.PROVIDER_REQUIRED + coverage.verdict_counts.NOT_VERIFIED, 54);
  assert.equal(counts.FUNCTIONALLY_PASSED, coverage.results.filter((result) => result.status === 'SUCCESS').length);
  assert.ok(counts.FUNCTIONALLY_PASSED < 54);
  assert.equal(verdicts.find((row) => row.id === 'DN-36')?.verdict, 'PROHIBITED_BY_POLICY');
  assert.equal(verdicts.find((row) => row.id === 'DN-40')?.verdict, 'NOT_VERIFIED');
  assert.deepEqual(counts, coverage.verdict_counts);
  console.log(JSON.stringify({ verdicts: counts, unsatisfied_node_ids: coverage.unsatisfied_node_ids }));
});
