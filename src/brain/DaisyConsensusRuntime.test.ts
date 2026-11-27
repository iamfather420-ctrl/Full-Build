import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ConsensusPolicy,
  ConsensusProposal,
  ConsensusCertificate,
  SignedEvaluatorVote,
  canonicalJson,
  policyDigest,
  proposalDigest,
  sha256Canonical,
  voteSigningPayload
} from './IndependentUnanimousConsensus';
import {
  DaisyConsensusRuntime,
  DockerIsolatedEvaluatorRunner
} from './DaisyConsensusRuntime';
import { SignedDaisyRuntimeConfig } from './DaisyConsensusConfig';
import { NeonDaisyConsensusStore } from './NeonDaisyConsensusStore';
import { DaisyBoundedExecutor } from './DaisyBoundedExecutor';

const evaluatorIds = ['evaluator-a', 'evaluator-b', 'evaluator-c'] as const;
const keys = evaluatorIds.map((evaluator_id, index) => ({
  evaluator_id,
  model_id: 'test-model-' + index,
  model_weights_sha256: String(index + 1).repeat(64),
  runtime_code_sha256: String(index + 4).repeat(64),
  image_digest: String(index + 7).repeat(64),
  ...generateKeyPairSync('ed25519')
}));
const now = Date.now();
const evidence = { test_evidence: 'verified-bundle', source: 'unit-test' };
const policy: ConsensusPolicy = {
  policy_id: 'test-policy',
  version: '1',
  valid_from: new Date(now - 60_000).toISOString(),
  expires_at: new Date(now + 60_000).toISOString(),
  max_proposal_age_ms: 30_000,
  max_vote_age_ms: 30_000,
  allowed_actions: ['WRITE_TEST_MARKER'],
  allowed_targets: ['isolated-test-target'],
  require_rollback_plan: true,
  evaluator_ids: evaluatorIds
};
const proposal: ConsensusProposal = {
  proposal_id: 'runtime-test-proposal',
  action: 'WRITE_TEST_MARKER',
  target: 'isolated-test-target',
  created_at: new Date(now - 1_000).toISOString(),
  nonce: 'runtime-test-nonce-001',
  payload_sha256: sha256Canonical({ payload: 'exact' }),
  evidence_sha256: sha256Canonical(evidence),
  rollback_plan_sha256: sha256Canonical({ rollback: 'no-op' })
};
const testKeyDirectory = mkdtempSync(join(tmpdir(), 'daisy-evaluator-keys-'));
const evaluators = keys.map((item, index) => {
  const signingKeyFile = join(testKeyDirectory, `evaluator-${index}.pem`);
  writeFileSync(signingKeyFile, item.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  chmodSync(signingKeyFile, 0o400);
  return {
    evaluator_id: item.evaluator_id,
    model_id: item.model_id,
    model_weights_sha256: item.model_weights_sha256,
    runtime_code_sha256: item.runtime_code_sha256,
    image_digest: item.image_digest,
    public_key_pem: item.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    image: 'registry.example/daisy-evaluator-' + index + '@sha256:' + item.image_digest,
    signing_key_file: signingKeyFile
  };
});
const rootKeys = generateKeyPairSync('ed25519');
const unsignedConfig = { policy, evaluators };
const config: SignedDaisyRuntimeConfig = {
  ...unsignedConfig,
  signature_base64: sign(null, Buffer.from(canonicalJson(unsignedConfig)), rootKeys.privateKey).toString('base64')
};
const rootPublicKey = rootKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();

function makeVote(index: number, sealedInput: string): SignedEvaluatorVote {
  const bundleSha = sha256Canonical({
    proposal: proposalDigest(proposal),
    policy: policyDigest(policy),
    evidence: proposal.evidence_sha256
  });
  const unsigned = {
    evaluator_id: evaluatorIds[index],
    model_id: keys[index].model_id,
    model_weights_sha256: keys[index].model_weights_sha256,
    runtime_code_sha256: keys[index].runtime_code_sha256,
    image_digest: keys[index].image_digest,
    decision: 'APPROVE' as const,
    proposal_sha256: proposalDigest(proposal),
    policy_sha256: policyDigest(policy),
    evidence_sha256: proposal.evidence_sha256,
    nonce: proposal.nonce,
    input_bundle_sha256: bundleSha,
    independence_attestation: 'ISOLATED_INPUT_ONLY' as const,
    signed_at: new Date(now).toISOString()
  };
  assert.ok(sealedInput.includes(proposal.proposal_id));
  return {
    ...unsigned,
    signature_base64: sign(null, voteSigningPayload(unsigned), keys[index].privateKey).toString('base64')
  };
}

test('isolated orchestration seals identical input and never shares peer votes', async () => {
  const seenInputs: string[] = [];
  let next = 0;
  const runner = {
    run: async (_evaluator: (typeof evaluators)[number], sealedInput: string) => {
      seenInputs.push(sealedInput);
      const vote = makeVote(next, sealedInput);
      next += 1;
      return vote;
    }
  };
  const consumed = new Set<string>();
  const nonceStore = {
    consumeOnce: async (nonce: string) => {
      if (consumed.has(nonce)) return false;
      consumed.add(nonce);
      return true;
    }
  };
  let executed = 0;
  const executor = new DaisyBoundedExecutor({
    WRITE_TEST_MARKER: async () => { executed += 1; }
  }, () => now);
  const runtime = new DaisyConsensusRuntime(config, nonceStore, executor, runner, () => now, rootPublicKey);
  const result = await runtime.evaluateAndExecute(proposal, evidence);
  assert.equal(result.status, 'APPROVED_AND_HANDLER_COMPLETED');
  assert.equal(executed, 1);
  assert.equal(seenInputs.length, 3);
  assert.equal(new Set(seenInputs).size, 1);
  assert.equal(consumed.size, 1);
});

test('replay is blocked before a second executor dispatch', async () => {
  const consumed = new Set<string>();
  const nonceStore = {
    consumeOnce: async (nonce: string) => {
      if (consumed.has(nonce)) return false;
      consumed.add(nonce);
      return true;
    }
  };
  let round = 0;
  const runner = {
    run: async (_evaluator: (typeof evaluators)[number], input: string) => makeVote(round++, input)
  };
  let executions = 0;
  const executor = new DaisyBoundedExecutor({
    WRITE_TEST_MARKER: async () => { executions += 1; }
  }, () => now);
  const runtime = new DaisyConsensusRuntime(config, nonceStore, executor, runner, () => now, rootPublicKey);
  assert.equal((await runtime.evaluateAndExecute(proposal, evidence)).status, 'APPROVED_AND_EXECUTED');
  round = 0;
  const replay = await runtime.evaluateAndExecute(proposal, evidence);
  assert.equal(replay.status, 'BLOCKED');
  assert.match(replay.reason || '', /NONCE_ALREADY_CONSUMED/);
  assert.equal(executions, 1);
});

test('evidence mutation blocks before evaluator invocation', async () => {
  let invocations = 0;
  const runner = {
    run: async () => {
      invocations += 1;
      throw new Error('must not run');
    }
  };
  const runtime = new DaisyConsensusRuntime(
    config,
    { consumeOnce: async () => true },
    new DaisyBoundedExecutor({ WRITE_TEST_MARKER: async () => {} }),
    runner,
    () => now,
    rootPublicKey
  );
  const result = await runtime.evaluateAndExecute(proposal, { test_evidence: 'tampered' });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason || '', /EVIDENCE_BUNDLE_DIGEST_MISMATCH/);
  assert.equal(invocations, 0);
});

test('executor rejects an action not explicitly registered by trusted composition', async () => {
  const runtimeExecutor = new DaisyBoundedExecutor({});
  const bundleSha = sha256Canonical({
    proposal: proposalDigest(proposal),
    policy: policyDigest(policy),
    evidence: proposal.evidence_sha256
  });
  const votes = keys.map((key, index) => makeVote(index, proposal.proposal_id));
  const certificateBody = {
    protocol: 'SOLVEX_DAISY_INDEPENDENT_UNANIMOUS_CONSENSUS_V1' as const,
    proposal,
    policy_sha256: policyDigest(policy),
    input_bundle_sha256: bundleSha,
    votes,
    generated_at: new Date(now).toISOString()
  };
  const certificate: ConsensusCertificate = {
    ...certificateBody,
    certificate_sha256: sha256Canonical(certificateBody)
  };
  await assert.rejects(
    () => runtimeExecutor.execute(proposal, proposalDigest(proposal), {
      policy, evaluators, votes, expectedInputBundleSha256: bundleSha,
      expectedProposalSha256: proposalDigest(proposal),
      expectedPolicySha256: policyDigest(policy),
      certificate
    }),
    /NO_TRUSTED_HANDLER_FOR_ACTION/
  );
});


test('tampered root-signed policy configuration is rejected at construction', () => {
  const badConfig = { ...config, signature_base64: Buffer.alloc(64, 7).toString('base64') };
  assert.throws(
    () => new DaisyConsensusRuntime(
      badConfig,
      { consumeOnce: async () => true },
      new DaisyBoundedExecutor({}),
      { run: async () => { throw new Error('must not run'); } },
      () => now,
      rootPublicKey
    ),
    /RUNTIME_CONFIG_SIGNATURE_INVALID/
  );
});

test('durable nonce store refuses the in-memory SQLite fallback', () => {
  assert.rejects(
    () => NeonDaisyConsensusStore.fromEnvironment({}),
    /DATABASE_URL_EXPECTED_HOST_TENANT_ID_AND_SOLVEX_ENV_REQUIRED/
  );
});


test('Docker runner applies required isolation flags and delivers only sealed stdin', async () => {
  const marker = join(testKeyDirectory, 'docker-invocation.json');
  const fakeDocker = join(testKeyDirectory, 'docker-test-double');
  const expectedVote = makeVote(0, 'sealed-input ' + proposal.proposal_id);
  const script = [
    '#!/usr/bin/env node',
    "const fs = require('node:fs');",
    'const args = process.argv.slice(2);',
    "const input = fs.readFileSync(0, 'utf8');",
    `fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({ args, input }));`,
    `process.stdout.write(${JSON.stringify(JSON.stringify(expectedVote))});`
  ].join('\n');
  writeFileSync(fakeDocker, script);
  chmodSync(fakeDocker, 0o755);
  const runner = new DockerIsolatedEvaluatorRunner(fakeDocker);
  const vote = await runner.run(evaluators[0], 'sealed-input ' + proposal.proposal_id);
  assert.equal(vote.evaluator_id, evaluators[0].evaluator_id);
  const invocation = JSON.parse(readFileSync(marker, 'utf8'));
  for (const requiredFlag of [
    'run', '--rm', '-i', '--pull=never', '--network=none', '--read-only',
    '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=64',
    '--memory=512m', '--cpus=1', '--tmpfs=/tmp:rw,noexec,nosuid,size=16m'
  ]) {
    assert.ok(invocation.args.includes(requiredFlag), 'missing Docker isolation flag: ' + requiredFlag);
  }
  assert.equal(invocation.input, 'sealed-input ' + proposal.proposal_id);
  assert.ok(invocation.args.includes(evaluators[0].image));
});
