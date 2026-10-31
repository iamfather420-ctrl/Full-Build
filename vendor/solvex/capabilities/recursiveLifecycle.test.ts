import { readFileSync } from 'node:fs';
import { HumanApprovalGate, approvalBindsCandidate } from '../governance/HumanApprovalGate';
import { CapabilityRegistry } from './CapabilityRegistry';
import { ProcedureStore } from '../knowledge/ProcedureStore';
import { demonstrateRecursiveLifecycle, generateGapClassifierSource } from './RecursiveLifecycle';
import { independentReview } from '../governance/independentReview';
import { DatasetRegistry } from '../training/DatasetRegistry';
import { FineTunePipeline } from '../training/FineTunePipeline';
import { corpusShape } from '../proofs/Corpus120';
import { NodeRegistry } from '../nodes/NodeRegistry';
import { computeSha256 } from '../database/DatabaseSchema';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const approvals = new HumanApprovalGate();
const registry = new CapabilityRegistry(approvals);
const procedures = new ProcedureStore();
const report = await demonstrateRecursiveLifecycle(registry, procedures, approvals);
const negative = report.cycles[0];
const first = report.cycles[1];
const second = report.cycles[2];
const third = report.cycles[3];

check('negative control does not become eligible', report.negative_control_blocked && negative?.deployed === false, negative?.reason ?? 'missing');
check('gap classifier is verified and not deployed', first?.status === 'APPROVAL_REQUIRED' && first.deployed === false && first.eligible === false, first?.reason ?? 'missing');
check('classifier tests cover the required classes', ['normal', 'invalid', 'adversarial', 'failure', 'dependency', 'boundary'].every((kind) => first?.tests.some((item) => item.kind === kind && item.pass)), first?.tests.map((item) => `${item.kind}:${item.pass}`).join(',') ?? '');
check('classifier formal results came from the solver', first?.formal.every((item) => item.proved && item.actual === item.expected) === true, JSON.stringify(first?.formal ?? []));
check('reuse cites the validated classifier and does not deploy', report.recursive_reuse_demonstrated && second?.provenance.reused === true && second?.provenance.parent_source_sha256 === first?.source_sha256, second?.reason ?? 'missing');
check('third cycle hits the recursion limit', report.recursion_limit_blocked, third?.reason ?? 'missing');
check('model and unverified human created no approval', report.approval_records === 0 && approvals.count() === 0, String(report.approval_records));
check('lifecycle is not complete', report.lifecycle_complete === false, report.blocker);

const stored = first?.capability_id ? registry.get(first.capability_id) : null;
check('stored capability remains non-executable', stored?.status === 'APPROVAL_REQUIRED' && stored.executable === false && stored.authority === 'none' && stored.evidence_sha256 === first?.source_sha256, stored?.status ?? 'missing');
check('approval key contains the source hash and version', !!first?.required_approval_key && first.required_approval_key === `capability:${first.capability_id}:${first.capability_version}:${first.source_sha256}`, first?.required_approval_key ?? '');
const mismatch = approvalBindsCandidate(first?.required_approval_key ?? null, {
  kind: 'capability',
  id: first?.capability_id ?? 'missing',
  version: first?.capability_version ?? 1,
  contentSha256: computeSha256('different candidate'),
});
check('a different candidate hash does not bind', mismatch.bound === false, mismatch.reason);
check('rollback evidence shows no production change', first?.rollback.production_changed === false && first.rollback.deployed_before === 0 && first.rollback.deployed_after === 0 && first.rollback.recovery_required === false, first?.rollback.known_good_sha256 ?? '');

const source = readFileSync(new URL('./RecursiveLifecycle.ts', import.meta.url), 'utf8');
check('lifecycle does not import payments or marketplace', !/PayPalAdapter|MarketplaceEngine/.test(source), 'import scan');
check('generated classifier hash matches the cycle', computeSha256(generateGapClassifierSource()) === first?.source_sha256, first?.source_sha256 ?? '');

const shape = corpusShape();
check('120-contract corpus shape is unchanged', shape.ok && shape.dfrl === 88 && shape.dh === 32, shape.reason ?? '88+32');
check('54-node registry is unchanged', NodeRegistry.getInstance().getAllNodes().length === 54, String(NodeRegistry.getInstance().getAllNodes().length));

const review = independentReview({
  capabilities: registry,
  procedures,
  datasets: [],
  checkpoints: new FineTunePipeline(new DatasetRegistry(), approvals),
});
check('independent review finds no deployment', review.ok, JSON.stringify(review.findings));

const failed = results.filter((item) => !item.pass);
const summary = {
  passed: results.length - failed.length,
  failed: failed.length,
  lifecycle_complete: report.lifecycle_complete,
  recursive_reuse_demonstrated: report.recursive_reuse_demonstrated,
  blocker: report.blocker,
  approval_records: report.approval_records,
  gap_classifier_sha256: first?.source_sha256 ?? null,
  reuse_binder_sha256: second?.source_sha256 ?? null,
  formal: [...(first?.formal ?? []), ...(second?.formal ?? [])],
  results,
};
console.log(JSON.stringify(summary, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
