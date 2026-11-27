import assert from 'node:assert/strict';
import test from 'node:test';
import { runProductionConsensusGate } from './verify-production-consensus';
import type { DaisyActivationGateRecord } from '../src/brain/DaisyActivationGate';

const sourceCommit = 'a'.repeat(40);

test('preview and development builds do not require production consent', async () => {
  let storeOpened = false;
  const result = await runProductionConsensusGate({ VERCEL_ENV: 'preview' }, {
    readRecord: () => null,
    isActivationActive: () => false,
    createStore: async () => {
      storeOpened = true;
      throw new Error('must not connect to Neon for preview');
    }
  });
  assert.deepEqual(result, { status: 'SKIPPED', reason: 'NON_PRODUCTION_BUILD' });
  assert.equal(storeOpened, false);
});

test('production build fails closed when the activation gate is not active', async () => {
  let storeOpened = false;
  await assert.rejects(
    () => runProductionConsensusGate({
      VERCEL_ENV: 'production',
      VERCEL_GIT_COMMIT_SHA: sourceCommit
    }, {
      readRecord: () => null,
      isActivationActive: () => false,
      createStore: async () => {
        storeOpened = true;
        throw new Error('must not connect to Neon');
      }
    }),
    /DAISY_ACTIVATION_GATE_NOT_ACTIVE/
  );
  assert.equal(storeOpened, false);
});

test('production build fails closed if the human authorization is not bound to a consensus certificate', async () => {
  const record = {
    status: 'ACTIVE',
    source_commit_sha: sourceCommit,
    activation_authorization: null,
    consensus_authorization: null
  } as unknown as DaisyActivationGateRecord;
  let storeOpened = false;
  await assert.rejects(
    () => runProductionConsensusGate({
      VERCEL_ENV: 'production',
      VERCEL_GIT_COMMIT_SHA: sourceCommit
    }, {
      readRecord: () => record,
      isActivationActive: () => true,
      createStore: async () => {
        storeOpened = true;
        throw new Error('must not connect to Neon');
      }
    }),
    /CONSENSUS_CERTIFICATE_NOT_BOUND_TO_HUMAN_AUTHORIZATION/
  );
  assert.equal(storeOpened, false);
});

test('production build rejects activation evidence bound to another source commit', async () => {
  const record = {
    status: 'ACTIVE',
    source_commit_sha: 'b'.repeat(40),
    activation_authorization: null,
    consensus_authorization: null
  } as unknown as DaisyActivationGateRecord;
  await assert.rejects(
    () => runProductionConsensusGate({
      VERCEL_ENV: 'production',
      VERCEL_GIT_COMMIT_SHA: sourceCommit
    }, {
      readRecord: () => record,
      isActivationActive: () => true,
      createStore: async () => { throw new Error('must not connect to Neon'); }
    }),
    /ACTIVATION_SOURCE_COMMIT_MISMATCH/
  );
});
