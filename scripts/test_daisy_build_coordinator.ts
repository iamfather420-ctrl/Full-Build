import assert from 'node:assert/strict';
import { DaisyBuildCoordinator } from '../src/daisy-build/DaisyBuildCoordinator';
import type {
  DaisyArchitectureSpec,
  DaisyWeightEnginePort,
  FullBuildCapabilityPort,
  WeightArtifact,
} from '../src/daisy-build/contracts';

const architecture: DaisyArchitectureSpec = {
  modelId: 'daisy-haminja',
  version: '0.1.0-test',
  architectureFamily: 'test-mlp',
  dimensions: { input: 8, hidden: 16, output: 8 },
  tokenizerId: 'test-tokenizer-v1',
  contextLength: 128,
  targetFormat: 'safetensors',
  trainingObjectives: ['next-token-prediction'],
  requiredCapabilities: ['formal-proof'],
};

const artifact: WeightArtifact = {
  artifactId: 'test-artifact',
  modelId: 'daisy-haminja',
  version: '0.1.0-test',
  format: 'safetensors',
  architectureHash: 'arch-hash',
  tensorCount: 3,
  parameterCount: 100,
  checksum: 'a'.repeat(64),
  checkpoint: true,
  provenance: { engine: 'test-engine', sourceRevision: 'test-sha', corpusIds: ['test-corpus'], trainingSteps: 1 },
};

let trained = false;
const engine: DaisyWeightEnginePort = {
  async inspect() { return { ready: true, engineVersion: 'test', sourceRevision: 'test-sha', missing: [] }; },
  async plan() { return { planId: 'plan', architectureHash: 'arch-hash', tensorCount: 3, parameterCount: 100, estimatedMemoryBytes: 4096, workerShards: 1, notes: [] }; },
  async initialize() { return artifact; },
  async train() { trained = true; return artifact; },
  async validate() { return { passed: true, checks: [{ id: 'shape', passed: true, detail: 'ok' }] }; },
  async export() { return { artifact, location: 'test://artifact', format: 'safetensors', checksum: artifact.checksum }; },
};

const fullBuild: FullBuildCapabilityPort = {
  async inventory() {
    return [{
      id: 'formal-proof',
      name: 'Formal proof',
      sourcePath: 'src/proofs/Z3FormalProofEngine.ts',
      mode: 'runtime-tool',
      description: 'test',
      verification: 'source-present-runtime-unverified',
    }];
  },
  async prepareTrainingCorpus() { return []; },
};

const request = {
  architecture,
  corpora: [{
    id: 'test-corpus',
    version: '1',
    uri: 'test://corpus',
    sha256: 'b'.repeat(64),
    purpose: 'coordinator contract test',
    approved: true,
  }],
  maxSteps: 1,
  checkpointEvery: 1,
  approval: { planApproved: true, resourceApproved: true, releaseApproved: true },
};

const result = await new DaisyBuildCoordinator(engine, fullBuild).build(request);
assert.equal(result.status, 'exported');
assert.equal(trained, true);
assert.deepEqual(result.completedStages, ['inventory', 'plan', 'initialize', 'train', 'validate', 'export']);

const blocked = await new DaisyBuildCoordinator(engine, fullBuild).build({
  ...request,
  approval: { planApproved: false, resourceApproved: true, releaseApproved: true },
});
assert.equal(blocked.status, 'blocked');
assert.equal(trained, true, 'plan approval failure must block before another training call');

console.log('Daisy build coordinator contract tests passed.');
