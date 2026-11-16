import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { submitAssertion, type DiscoveryReview } from '../discovery/DiscoverEngineClient.ts';
import { BuildLedger } from '../dipstick/BuildLedger.ts';
import { LocalInferenceRuntime } from '../inference/LocalInferenceRuntime.ts';
import { SwarmForge } from '../swarm/SwarmForge.ts';
import { applySgd, assembleTensors, evaluate, generateDataset, loadKernel, planBuild, splitParts, validateWeights } from '../../packages/daisy-weight-engine/src/index.ts';

export interface EcosystemStep {
  step: string;
  status: 'COMPLETED' | 'WITHHELD' | 'BLOCKED';
  detail: string;
}

const ARCHITECTURE = { name: 'daisy-seed', family: 'mlp-classifier' as const, inputSize: 2, hiddenSizes: [8], outputSize: 1, seed: 42 };

export async function runUnifiedScenario(objective: string, discovery?: { baseUrl: string; token: string; body: unknown }): Promise<{
  steps: EcosystemStep[];
  discovery: DiscoveryReview | null;
  languageModelReady: boolean;
  parameterCount: number;
  artifactSha256: string | null;
}> {
  const steps: EcosystemStep[] = [];
  const runtime = new LocalInferenceRuntime();
  const info = await runtime.probe();
  const generation = await runtime.generate({ messages: [{ role: 'user', content: objective }] });
  steps.push({
    step: 'language-model-plan',
    status: generation.status === 'COMPLETED' ? 'COMPLETED' : 'BLOCKED',
    detail: info.ready
      ? `Model ${info.modelId ?? 'unlabeled'} returned a plan.`
      : 'GGUF model or inference engine is not configured. No simulated plan was generated.',
  });

  let discoveryReview: DiscoveryReview | null = null;
  if (!discovery) {
    steps.push({ step: 'discover-engine', status: 'BLOCKED', detail: 'No Discover-Engine URL was configured.' });
  } else {
    const response = await submitAssertion(discovery.baseUrl, discovery.token, discovery.body);
    discoveryReview = response.review;
    steps.push({
      step: 'discover-engine',
      status: response.review?.withheld ? 'WITHHELD' : 'BLOCKED',
      detail: response.review
        ? `${response.review.service} returned ${response.review.reviewStatus}; publishable=${response.review.publishable}.`
        : `Discover-Engine HTTP ${response.status}.`,
    });
  }

  const build = BuildLedger.open(objective);
  BuildLedger.record(build.buildId, 'objective', objective);
  const model = loadKernel(ARCHITECTURE);
  const plan = planBuild(ARCHITECTURE, 2);
  const data = generateDataset(128, 2, 1, 12);
  const trained = applySgd(model, data.slice(0, 96), 0.03, 40);
  const validation = validateWeights(trained);
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  const shards = splitParts(trained, 2);
  const swarm = new SwarmForge();
  swarm.register({ id: 'cpu-1', kind: 'cpu', available: true });
  swarm.register({ id: 'gpu-1', kind: 'gpu', available: false });
  const gpu = await swarm.runShard(build.buildId, 'gpu-shard', 'gpu-1', '', () => undefined);
  steps.push({ step: 'gpu-worker', status: gpu, detail: 'No GPU provider is configured.' });
  for (const [index, shard] of shards.entries()) {
    const artifact = JSON.stringify(shard);
    await swarm.runShard(build.buildId, `cpu-shard-${index}`, 'cpu-1', artifact, () => undefined);
  }
  const assembled = assembleTensors(shards, trained);
  const directory = await mkdtemp(path.join(tmpdir(), 'daisy-weights-'));
  const artifactPath = path.join(directory, 'reference-mlp.json');
  const bytes = JSON.stringify(assembled);
  await writeFile(artifactPath, bytes);
  const artifactSha256 = createHash('sha256').update(bytes).digest('hex');
  BuildLedger.record(build.buildId, 'artifact', `${artifactPath} ${artifactSha256}`);
  const loss = evaluate(assembled, data.slice(96));
  steps.push({
    step: 'cpu-weight-engine',
    status: 'COMPLETED',
    detail: `Reference MLP only, ${plan.totalParameters} parameters, holdout loss ${loss}. This is not the language model.`,
  });
  steps.push({
    step: 'production',
    status: 'BLOCKED',
    detail: 'Production deployment, payment capture, and live Neon migration were not authorized.',
  });
  BuildLedger.close(build.buildId);
  return { steps, discovery: discoveryReview, languageModelReady: info.ready, parameterCount: plan.totalParameters, artifactSha256 };
}
