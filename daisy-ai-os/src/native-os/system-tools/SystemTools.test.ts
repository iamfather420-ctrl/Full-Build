import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionKernel } from '../permissions/PermissionKernel.ts';
import { SystemTools } from './SystemTools.ts';

const passing = {
  task: 'Inspect native Daisy process status',
  output: 'A requested status operation',
  mode: 'EXECUTABLE' as const,
  evidenceLabel: 'PROPOSED' as const,
  audience: 'System operator',
  domain: 'Native system tools',
  assessments: { taskRelevance: 'PASS' as const, contextualAppropriateness: 'PASS' as const, safety: 'PASS' as const, evidenceIntegrity: 'PASS' as const },
  executionAuthorized: true,
};

test('native tools fail closed when CICAP assessment is absent', () => {
  const tools = new SystemTools(new PermissionKernel());
  const result = tools.invoke('daisy', 'proc_status');
  assert.equal(result.ok, false);
  assert.match(result.message, /CICAP_BLOCKED/);
});

test('native tools fail closed when CICAP requires review', () => {
  const tools = new SystemTools(new PermissionKernel());
  const result = tools.invoke('daisy', 'proc_status', {}, { ...passing, assessments: { ...passing.assessments, safety: 'UNKNOWN' } });
  assert.equal(result.ok, false);
  assert.match(result.message, /CICAP_REVIEW_REQUIRED/);
});

test('native tools evaluate CICAP before the existing permission kernel', () => {
  const tools = new SystemTools(new PermissionKernel());
  const result = tools.invoke('daisy', 'proc_status', {}, passing);
  assert.equal(result.ok, true);
  assert.equal(result.creative_integrity?.decision, 'ALLOW');
});

test('CICAP allow does not bypass native permission denial', () => {
  const tools = new SystemTools(new PermissionKernel());
  const result = tools.invoke('untrusted-user', 'proc_status', {}, passing);
  assert.equal(result.ok, false);
  assert.match(result.message, /insufficient privilege/);
});
