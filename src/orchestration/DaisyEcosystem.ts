import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DaisyBrainGraph, type SynapseManifest } from '../brain/DaisyBrainGraph.ts';
import { FileLearningBubbleStore } from '../brain/FileLearningBubbleStore.ts';
import { LearningBubbleRegistry } from '../brain/LearningBubbleRegistry.ts';
import { submitAssertion, type DiscoveryReview } from '../discovery/DiscoverEngineClient.ts';
import { BuildLedger } from '../dipstick/BuildLedger.ts';
import { LocalInferenceRuntime } from '../inference/LocalInferenceRuntime.ts';
import { DaisySubsystemExecutors } from '../nodes/DaisySubsystemExecutors.ts';
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

  const manifestPath = process.env.DAISY_SYNAPSE_MANIFEST;
  if (!manifestPath) {
    steps.push({ step: 'synapse-graph', status: 'BLOCKED', detail: 'No authoritative 120-synapse manifest was recovered. No edges were invented.' });
  } else {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as SynapseManifest;
    const graph = DaisyBrainGraph.validate(manifest);
    steps.push({ step: 'synapse-graph', status: graph.valid ? 'COMPLETED' : 'BLOCKED', detail: graph.valid ? `Loaded ${graph.synapse_count} source-backed synapses.` : graph.errors.join(' ') });
  }

  const genesis = await new DaisySubsystemExecutors().executeNode('DN-01');
  steps.push({
    step: 'node-dn-01',
    status: genesis.status === 'SUCCESS' ? 'COMPLETED' : 'BLOCKED',
    detail: `DN-01 ${genesis.status}, scope ${genesis.claim_scope}. This does not make all 54 nodes operational.`,
  });

  const bubbleDir = await mkdtemp(path.join(tmpdir(), 'daisy-bubbles-'));
  const observation = 'Unreviewed observation from the reference scenario.';
  const bubble = new LearningBubbleRegistry(new FileLearningBubbleStore(bubbleDir)).create({
    content: observation,
    source: {
      source_id: 'scenario',
      source_type: 'local-run',
      captured_at: new Date().toISOString(),
      source_sha256: createHash('sha256').update(objective).digest('hex'),
      captured_content_sha256: createHash('sha256').update(observation).digest('hex'),
    },
    evidence_refs: [],
    verification: 'UNREVIEWED',
    license_status: 'UNKNOWN',
    paradox_ids: [],
    node_ids: ['DN-01'],
    synapse_ids: [],
    contradiction_refs: [],
  });
  steps.push({
    step: 'learning-bubble',
    status: bubble.training_eligibility === 'INELIGIBLE' ? 'WITHHELD' : 'BLOCKED',
    detail: `Bubble ${bubble.bubble_id} reloaded from disk as ${bubble.training_eligibility}. It was not sent to training.`,
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
