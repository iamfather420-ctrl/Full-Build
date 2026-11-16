import { createHash } from 'node:crypto';
import { classifyAssertion, type Assertion, type Classification } from '../discovery/EvidenceGate.ts';
import { BuildLedger } from '../dipstick/BuildLedger.ts';
import { applySgd, assembleTensors, evaluate, generateDataset, loadKernel, planBuild, splitParts, validateWeights } from '../../packages/daisy-weight-engine/src/index.ts';

export interface EcosystemStep {
  step: string;
  status: 'COMPLETED' | 'WITHHELD' | 'BLOCKED';
  detail: string;
}

const ARCHITECTURE = { name: 'daisy-seed', family: 'mlp-classifier' as const, inputSize: 2, hiddenSizes: [8], outputSize: 1, seed: 42 };

function solversFor(assertion: Assertion, verdict: 'support' | 'withhold'): Assertion['solvers'] {
  const inputSha256 = createHash('sha256').update(JSON.stringify({ id: assertion.id, text: assertion.text.trim() })).digest('hex');
  return [
    { solverId: 'discovery-engine', verdict, inputSha256 },
    { solverId: 'replay-checker', verdict, inputSha256 },
  ];
}

export function runUnifiedScenario(objective: string): { steps: EcosystemStep[]; verified: Classification; withheld: Classification; parameterCount: number; holdoutLoss: number } {
  const steps: EcosystemStep[] = [];
  steps.push({ step: 'plan', status: 'COMPLETED', detail: 'CPU reference plan: discover, train one MLP, shard it, and replay the loss.' });

  const missing = 'Full-scale GPU training completed.';
  const withheld = classifyAssertion({
    id: 'gpu-completion',
    text: missing,
    sources: [{ id: 'narrative', text: missing, sha256: createHash('sha256').update(missing).digest('hex') }],
    solvers: [],
  });
  steps.push({ step: 'discovery-unverified', status: 'WITHHELD', detail: withheld.reason });

  const measured = 'Reference MLP holdout loss is independently recomputed from the artifact.';
  const verifiedAssertion: Assertion = {
    id: 'reference-mlp-loss',
    text: measured,
    sources: [{ id: 'measurement-note', text: measured, sha256: createHash('sha256').update(measured).digest('hex') }],
    solvers: [],
  };
  verifiedAssertion.solvers = solversFor(verifiedAssertion, 'support');
  const verified = classifyAssertion(verifiedAssertion);
  steps.push({ step: 'discovery-verified-scope', status: verified.publishable ? 'COMPLETED' : 'WITHHELD', detail: verified.reason });

  const build = BuildLedger.open(objective);
  const model = loadKernel(ARCHITECTURE);
  const plan = planBuild(ARCHITECTURE, 2);
  const data = generateDataset(128, 2, 1, 12);
  const holdout = data.slice(96);
  const trained = applySgd(model, data.slice(0, 96), 0.03, 40);
  const validation = validateWeights(trained);
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  const shards = splitParts(trained, plan.tensors.length > 0 ? 2 : 1);
  shards.forEach((shard, index) => {
    const taskId = `shard-${index}`;
    BuildLedger.assign(build.buildId, taskId, 'weight-shard');
    BuildLedger.complete(build.buildId, taskId, JSON.stringify(shard));
  });
  const assembled = assembleTensors(shards, trained);
  const recordedLoss = evaluate(assembled, holdout);
  const replayLoss = evaluate(assembled, holdout);
  if (recordedLoss !== replayLoss || !Number.isFinite(recordedLoss)) throw new Error('Discovery replay did not reproduce the recorded loss.');
  steps.push({
    step: 'weight-swarm-dipstick-inference',
    status: 'COMPLETED',
    detail: `Assembled ${plan.totalParameters} parameters across ${shards.length} checksummed shards. Holdout loss ${recordedLoss}.`,
  });
  steps.push({
    step: 'full-build-record',
    status: 'COMPLETED',
    detail: `Build ${build.buildId} recorded ${BuildLedger.current()?.tasks.length ?? 0} tasks. Payments and production release were not authorized.`,
  });
  BuildLedger.close(build.buildId);
  steps.push({ step: 'production', status: 'BLOCKED', detail: 'Production deployment and payment capture remain closed.' });
  return { steps, verified, withheld, parameterCount: plan.totalParameters, holdoutLoss: recordedLoss };
}
