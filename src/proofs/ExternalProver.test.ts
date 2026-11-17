import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessProverRun, runExternalProver, sourceIsClosed } from './ExternalProver';

test('a fabricated success flag or the wrong binary cannot pass', () => {
  assert.equal(sourceIsClosed('theorem t : True := by sorry').ok, false);
  assert.equal(sourceIsClosed('Theorem t : True. Proof. Admitted.').ok, false);
  assert.equal(sourceIsClosed('Axiom unsafe : True.').ok, false);
  assert.equal(sourceIsClosed('Theorem t : True. Proof. ADMITTED.').ok, false);
  const fabricated = assessProverRun({
    basename: 'true',
    expectedBasenames: new Set(['lean']),
    versionText: 'verified',
    versionPattern: /Lean \(version \d+/,
    exitCode: 0,
    stdout: 'VERIFIED',
    stderr: '',
    sourceClosed: true,
  });
  assert.equal(fabricated.verified, false);
  const failedLean = assessProverRun({
    basename: 'lean',
    expectedBasenames: new Set(['lean']),
    versionText: 'Lean (version 4.24.0)',
    versionPattern: /Lean \(version \d+/,
    exitCode: 1,
    stdout: '',
    stderr: 'error: unknown',
    sourceClosed: true,
  });
  assert.equal(failedLean.verified, false);
  const admitted = assessProverRun({
    basename: 'lean',
    expectedBasenames: new Set(['lean']),
    versionText: 'Lean (version 4.24.0)',
    versionPattern: /Lean \(version \d+/,
    exitCode: 0,
    stdout: '',
    stderr: 'warning: declaration uses sorry',
    sourceClosed: true,
  });
  assert.equal(admitted.verified, false);
});

test('a missing prover fails closed and is not marked executed as verified', () => {
  const previous = process.env.SOLVEX_LEAN_BIN;
  process.env.SOLVEX_LEAN_BIN = 'UNAVAILABLE';
  try {
    const evidence = runExternalProver('lean4', ['formal/lean/BoundedZeno.lean'], ['formal/lean/BoundedZeno.lean']);
    assert.equal(evidence.prover_execution_verified, false);
    assert.match(evidence.reason, /not installed/);
  } finally {
    if (previous === undefined) delete process.env.SOLVEX_LEAN_BIN;
    else process.env.SOLVEX_LEAN_BIN = previous;
  }
});