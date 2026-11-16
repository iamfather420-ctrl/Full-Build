import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { BuildLedger } from '../dipstick/BuildLedger.ts';
import { runUnifiedScenario } from './DaisyEcosystem.ts';

const token = 'discovery-test-token-32-characters-min';

function startDiscoverEngine(): Promise<{ url: string; stop: () => void }> {
  const child = spawn('npx', ['tsx', 'main.ts'], {
    cwd: '/tmp/discover/invention-service',
    env: { ...process.env, PORT: '0', DISCOVERY_API_TOKEN: token, MONGO_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  child.unref();
  return new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error(log || 'Discover-Engine did not start')), 20_000);
    child.stdout?.on('data', (chunk) => {
      log += chunk.toString();
      const match = log.match(/ready port=(\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({
        url: `http://127.0.0.1:${match[1]}`,
        stop: () => {
          try { process.kill(-child.pid!, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
        },
      });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Discover-Engine exited ${code}: ${log}`));
    });
  });
}

test('Daisy calls Discover-Engine, blocks the language model, and trains only the reference MLP', async () => {
  BuildLedger.resetForTest();
  const engine = await startDiscoverEngine();
  try {
    const result = await runUnifiedScenario('Verify the reference build and do not invent a GPU result.', {
      baseUrl: engine.url,
      token,
      body: {
        discovery: {
          id: 'src-1', source: 'arxiv', title: 'A note', abstract: 'The measured loss fell by 2%.',
          year: 2024, url: 'https://arxiv.org/abs/2401.00001', field: 'test', lens: 'core', keywords: [],
          metrics: [], citations: 0, type: 'preprint', sourceVerification: 'verified_metadata',
        },
        claim: {
          id: 'claim-1', text: 'The measured loss fell by 2%.', kind: 'numeric', sourceId: 'src-1',
          sourceUrl: 'https://arxiv.org/abs/2401.00001', sourceTitle: 'A note',
          locator: { kind: 'abstract_sentence', sentenceIndex: 0, quote: 'The measured loss fell by 2%.' },
          quantitativeTokens: ['2%'], corroboratingSourceIds: [], corroborationStatus: 'candidate_only_unassessed',
          reviewStatus: 'human_review_required', evidenceGrade: 'metadata_verified_abstract_only', limitations: [],
        },
      },
    });
    assert.equal(result.discovery?.publishable, false);
    assert.equal(result.discovery?.reviewStatus, 'human_review_required');
    assert.equal(result.languageModelReady, false);
    assert.equal(result.steps.find((step) => step.step === 'language-model-plan')?.status, 'BLOCKED');
    assert.equal(result.steps.find((step) => step.step === 'gpu-worker')?.status, 'BLOCKED');
    assert.equal(result.parameterCount, 33);
    assert.match(result.artifactSha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(BuildLedger.current(), null);
  } finally {
    engine.stop();
  }
});
