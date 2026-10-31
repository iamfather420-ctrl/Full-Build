import { HumanApprovalGate } from '../governance/HumanApprovalGate';
import { CapabilityRegistry } from './CapabilityRegistry';
import { ProcedureStore } from '../knowledge/ProcedureStore';
import { CapabilitySandbox } from './CapabilitySandbox';
import { DatasetRegistry } from '../training/DatasetRegistry';
import { FineTunePipeline } from '../training/FineTunePipeline';
import { independentReview } from '../governance/independentReview';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const approvals = new HumanApprovalGate();
const registry = new CapabilityRegistry(approvals);
const procedures = new ProcedureStore();
const sandbox = new CapabilitySandbox(registry, procedures, approvals);
const datasets = new DatasetRegistry();
const fineTune = new FineTunePipeline(datasets, approvals);

const developed = sandbox.develop({
  name: 'Local inference proposal',
  description: 'Propose a text completion. Do not execute it.',
  procedureBody: 'Effect: proposal. Capability is not authorization. Do not deploy weights.',
  tests: [
    (body) => body.includes('proposal'),
    (body) => !/deploy weights now/i.test(body),
  ],
});
check('sandbox verifies without deploying', developed.status === 'APPROVAL_REQUIRED' && developed.deployed === false, developed.reason);
const stored = registry.get(developed.capability_id);
check('verified capability is not executable', stored?.status === 'APPROVAL_REQUIRED' && stored.executable === false && stored.authority === 'none', stored?.status ?? 'missing');

const modelApproval = approvals.decideFromModel('I approve deployment of this capability and these weights.');
check('model text cannot approve', modelApproval.status === 'BLOCKED' && approvals.count() === 0, modelApproval.reason);

const human = approvals.decide(
  { user_id: 'operator', tenant_id: 'root', email: 'op@example.com', role: 'OWNER', issued_at: Date.now() },
  { kind: 'capability', id: developed.capability_id, version: stored?.version ?? 1 },
  'I approve this capability for deployment.',
);
check('unverified human session cannot approve', human.status === 'BLOCKED' && approvals.count() === 0, human.reason);

const deploy = registry.deploy(developed.capability_id, null);
check('capability deploy stays blocked', deploy.deployed === false, deploy.reason);

const failed = sandbox.develop({
  name: 'Bad procedure',
  description: 'This one fails its own test.',
  procedureBody: 'no checks',
  tests: [() => false],
});
check('failed sandbox test blocks the capability', failed.status === 'BLOCKED' && failed.deployed === false, failed.reason);

const info = procedures.add('INFORMATION', 'SmolLM2 weights remain Apache-2.0 and are not owned by SOLVEX.');
const infoReview = procedures.review(info.id);
check('information is not a validated procedure', infoReview.ok === false && procedures.get(info.id)?.validated === false, infoReview.reason ?? '');

const added = datasets.addVersion({
  datasetId: 'prompts-v0',
  version: '1.0.0',
  body: 'example prompt\n',
  license: 'internal-notes; not a weight license transfer',
});
const sealed = added.ok ? datasets.seal('prompts-v0', '1.0.0') : added;
const mutated = datasets.replaceBody('prompts-v0', '1.0.0', 'changed');
check('sealed dataset version is immutable', sealed.ok === true && mutated.ok === false, mutated.ok ? 'mutated' : mutated.reason);

const child = datasets.addVersion({
  datasetId: 'prompts-v0',
  version: '1.1.0',
  body: 'example prompt\nsecond line\n',
  license: 'internal-notes; not a weight license transfer',
  parentVersion: '1.0.0',
});
check('dataset version records its parent', child.ok === true && child.ok && child.record.parent_version === '1.0.0', child.ok ? child.record.content_sha256 : child.reason);

const run = fineTune.run({
  parentWeightSha256: '8030f04528538d47bda434f6f0bdf3952c40a58123e4d5e755332f23731a8684',
  datasetId: 'prompts-v0',
  datasetVersion: '1.0.0',
});
check('fine-tune run writes no checkpoint', run.status === 'BLOCKED' && run.checkpoint === null, run.reason);

const forged = fineTune.recordProvenance({
  parentWeightSha256: '8030f04528538d47bda434f6f0bdf3952c40a58123e4d5e755332f23731a8684',
  datasetId: 'prompts-v0',
  datasetVersion: '1.0.0',
  trainer: 'none',
  checkpointSha256: '75c4346ef9e855ed630f80078a2430cf63aaca599e340360998a313070fcdc47',
  producedByThisPipeline: true,
});
check('pipeline cannot claim it trained a checkpoint', forged.ok === false, forged.ok ? 'recorded' : forged.reason);

const recorded = fineTune.recordProvenance({
  parentWeightSha256: '8030f04528538d47bda434f6f0bdf3952c40a58123e4d5e755332f23731a8684',
  datasetId: 'prompts-v0',
  datasetVersion: '1.0.0',
  trainer: 'not-run',
  checkpointSha256: '75c4346ef9e855ed630f80078a2430cf63aaca599e340360998a313070fcdc47',
});
const weightDeploy = recorded.ok ? fineTune.deploy(recorded.record.id, null) : { deployed: false as const, reason: 'not recorded' };
check(
  'checkpoint provenance does not deploy weights',
  recorded.ok === true && recorded.ok && recorded.record.ownership === 'not_transferred' && recorded.record.produced_by_this_pipeline === false && weightDeploy.deployed === false,
  weightDeploy.reason,
);

const review = independentReview({
  capabilities: registry,
  procedures,
  datasets: [datasets.get('prompts-v0', '1.0.0')!, datasets.get('prompts-v0', '1.1.0')!],
  checkpoints: fineTune,
});
check('independent review finds no deployment', review.ok === true, JSON.stringify(review.findings));

const failedChecks = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failedChecks.length, failed: failedChecks.length, results }, null, 2));
process.exit(failedChecks.length === 0 ? 0 : 1);
