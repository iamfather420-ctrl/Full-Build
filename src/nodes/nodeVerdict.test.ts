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
  assert.deepEqual(coverage.unsatisfied_node_ids, []);
  const pipelineNode = coverage.results.find(result => result.node_id === 'DN-11');
  assert.ok(pipelineNode);
  assert.equal(classifyNodeResult(pipelineNode), 'NOT_VERIFIED');
  assert.deepEqual(coverage.evidence_missing_node_ids, []);
  assert.equal(coverage.all_passed, false);
  assert.equal(coverage.all_passed, coverage.execution_complete && coverage.evidence_missing_node_ids.length === 0 && coverage.verdict_counts.FUNCTIONALLY_PASSED + coverage.verdict_counts.SAFETY_PASSED + coverage.verdict_counts.PROHIBITED_BY_POLICY === 54 && coverage.verdict_counts.PROVIDER_REQUIRED === 0 && coverage.verdict_counts.NOT_VERIFIED === 0);
  assert.equal(coverage.verdict_counts.FUNCTIONALLY_PASSED + coverage.verdict_counts.SAFETY_PASSED + coverage.verdict_counts.PROHIBITED_BY_POLICY + coverage.verdict_counts.PROVIDER_REQUIRED + coverage.verdict_counts.NOT_VERIFIED, 54);
  assert.equal(counts.FUNCTIONALLY_PASSED, coverage.results.filter((result) => result.status === 'SUCCESS').length);
  assert.ok(counts.FUNCTIONALLY_PASSED < 54);
  assert.equal(verdicts.find((row) => row.id === 'DN-36')?.verdict, 'PROHIBITED_BY_POLICY');
  const lean = verdicts.find((row) => row.id === 'DN-40');
  assert.ok(lean);
  assert.equal(lean.verdict, lean.status === 'SUCCESS' ? 'FUNCTIONALLY_PASSED' : 'NOT_VERIFIED');
  const range = verdicts.find((row) => row.id === 'DN-53');
  assert.equal(range?.status, 'SUCCESS');
  assert.equal(range?.verdict, 'FUNCTIONALLY_PASSED');
  assert.deepEqual(counts, coverage.verdict_counts);
  const providerRequired = {
    node_id: 'DN-51',
    status: 'PROVIDER_REQUIRED',
    evidence: { hsm_attestation_verified: false, external_provider_required: true }
  } as any;
  assert.equal(classifyNodeResult(providerRequired), 'PROVIDER_REQUIRED');
  assert.ok(coverage.not_verified_node_ids.includes('DN-11'));
  assert.equal(coverage.provider_required_node_ids.length, coverage.verdict_counts.PROVIDER_REQUIRED);
  console.log(JSON.stringify({ verdicts: counts, unsatisfied_node_ids: coverage.unsatisfied_node_ids, node_results: coverage.results.filter(result => classifyNodeResult(result) === 'NOT_VERIFIED' || classifyNodeResult(result) === 'PROVIDER_REQUIRED').map(result => ({ node_id: result.node_id, status: result.status, claim_scope: result.claim_scope, evidence: result.evidence, error: result.error })) }));
});
