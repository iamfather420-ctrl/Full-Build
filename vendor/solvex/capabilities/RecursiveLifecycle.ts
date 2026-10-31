import vm from 'node:vm';
import { computeSha256 } from '../database/DatabaseSchema';
import { CapabilityRegistry, type CapabilityRecord } from './CapabilityRegistry';
import { ProcedureStore } from '../knowledge/ProcedureStore';
import { HumanApprovalGate, approvalBindsCandidate, approvalSubjectKey } from '../governance/HumanApprovalGate';
import type { UserContext } from '../auth/AuthService';
import { Z3FormalProofEngine } from '../proofs/Z3FormalProofEngine';
import { acceptRecursiveLifecycle } from './lifecycleAcceptance';

export type CaseKind = 'normal' | 'invalid' | 'adversarial' | 'failure' | 'dependency' | 'boundary';

export interface VerificationCase {
  name: string;
  kind: CaseKind;
  run: (fn: (input: unknown) => unknown) => boolean;
}

export interface FormalClaim {
  id: string;
  claim: string;
  smt: string;
  expected: 'sat' | 'unsat';
}

export interface CycleSpec {
  problemId: string;
  statement: string;
  requiredCapability: string;
  functionality: string;
  assumptions: string[];
  dependencies: string[];
  securityBoundaries: string[];
  source: string;
  exportName: string;
  parent: { capabilityId: string; sourceSha256: string; fn: (input: unknown) => unknown } | null;
  cases: VerificationCase[];
  formal: FormalClaim[];
}

export interface CycleResult {
  phase: 'DISCOVERED' | 'BLOCKED' | 'APPROVAL_REQUIRED';
  problem_id: string;
  capability_id: string | null;
  capability_version: number | null;
  source_sha256: string;
  status: 'BLOCKED' | 'APPROVAL_REQUIRED';
  deployed: boolean;
  eligible: boolean;
  authorization: 'BLOCKED' | 'RECORDED';
  authorization_reason: string;
  required_approval_key: string | null;
  tests: Array<{ name: string; kind: CaseKind; pass: boolean }>;
  formal: Array<{ id: string; expected: string; actual: string; proved: boolean }>;
  proposal: {
    problem: string;
    functionality: string;
    assumptions: string[];
    implementation_sha256: string;
    dependencies: string[];
    test_criteria: string[];
    security_boundaries: string[];
  };
  provenance: {
    parent_capability_id: string | null;
    parent_source_sha256: string | null;
    reused: boolean;
    model_claim_used_as_evidence: false;
  };
  rollback: {
    known_good_sha256: string;
    after_sha256: string;
    deployed_before: number;
    deployed_after: number;
    production_changed: boolean;
    recovery_required: false;
  };
  reason: string;
}

export interface LifecycleReport {
  lifecycle_complete: false;
  recursive_reuse_demonstrated: boolean;
  blocker: string;
  cycles: CycleResult[];
  negative_control_blocked: boolean;
  recursion_limit_blocked: boolean;
  approval_records: number;
  verifier_accepted: boolean;
}

const FORBIDDEN_SOURCE = [
  /child_process/,
  /\brequire\s*\(/,
  /\bprocess\b/,
  /paypal/i,
  /marketplace/i,
  /AuthService/,
  /HumanApprovalGate/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bimport\s/,
  /node:/,
];

export function generateGapClassifierSource(): string {
  return `function classifyGap(input) {
  function rejected(status) {
    return {
      status: status,
      authority: 'none',
      executable: false,
      requires_new_capability: false,
      missing: [],
      possessed: []
    };
  }
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return rejected('INVALID');
  if (input.dependencyAvailable === false) return rejected('DEPENDENCY_FAILED');
  if (!Array.isArray(input.required) || !Array.isArray(input.registered)) return rejected('INVALID');
  function clean(list) {
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var name = list[i];
      if (typeof name !== 'string') return null;
      if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(name)) return null;
      out.push(name);
    }
    return out;
  }
  var required = clean(input.required);
  var registered = clean(input.registered);
  if (!required || !registered) return rejected('INVALID');
  var missing = [];
  var possessed = [];
  for (var j = 0; j < required.length; j += 1) {
    if (registered.indexOf(required[j]) !== -1) possessed.push(required[j]);
    else missing.push(required[j]);
  }
  return {
    status: 'OK',
    authority: 'none',
    executable: false,
    requires_new_capability: missing.length > 0,
    missing: missing,
    possessed: possessed
  };
}
`;
}

export function generateReuseBinderSource(): string {
  return `function bindReuse(input) {
  function rejected(status) {
    return {
      status: status,
      authority: 'none',
      executable: false,
      approved: false,
      cites: [],
      parent_capability: null
    };
  }
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return rejected('INVALID');
  if (typeof input.classify !== 'function') return rejected('DEPENDENCY_FAILED');
  var gap;
  try {
    gap = input.classify({
      required: input.required,
      registered: input.registered,
      dependencyAvailable: input.dependencyAvailable
    });
  } catch (err) {
    return rejected('DEPENDENCY_FAILED');
  }
  if (!gap || gap.authority !== 'none' || gap.executable !== false || gap.status !== 'OK') return rejected('BOUNDARY');
  if (gap.requires_new_capability !== true || !Array.isArray(gap.missing) || gap.missing.length === 0) return rejected('NOT_A_GAP');
  return {
    status: 'PROPOSAL',
    authority: 'none',
    executable: false,
    approved: false,
    cites: gap.missing.slice(),
    parent_capability: typeof input.parentId === 'string' ? input.parentId : null
  };
}
`;
}

function sourceAllowed(source: string): string | null {
  for (const pattern of FORBIDDEN_SOURCE) {
    if (pattern.test(source)) return `BLOCKED: candidate source crosses a security boundary (${pattern}).`;
  }
  return null;
}

function loadCapability(source: string, exportName: string): (input: unknown) => unknown {
  const sandbox: Record<string, unknown> = { deployed: false };
  vm.createContext(sandbox);
  const script = new vm.Script(source, { filename: `sandbox-${exportName}.js` });
  script.runInContext(sandbox, { timeout: 1000 });
  const fn = sandbox[exportName];
  if (typeof fn !== 'function') throw new Error(`BLOCKED: sandbox did not export ${exportName}.`);
  return (input: unknown) => {
    const value = (fn as (input: unknown) => unknown)(input);
    if (sandbox.deployed !== false) throw new Error('BLOCKED: sandbox candidate mutated deployment state.');
    return value;
  };
}

function deployedCount(registry: CapabilityRegistry): number {
  return registry.list().filter((row) => row.status === 'DEPLOYED').length;
}

function registryImage(registry: CapabilityRegistry): string {
  const rows = registry.list().map((row) => ({
    id: row.id,
    version: row.version,
    status: row.status,
    executable: row.executable,
    authority: row.authority,
    evidence_sha256: row.evidence_sha256,
  }));
  return computeSha256(JSON.stringify(rows));
}

function emptyCycle(spec: CycleSpec, sourceSha: string, knownGood: string, reason: string): CycleResult {
  return {
    phase: 'BLOCKED',
    problem_id: spec.problemId,
    capability_id: null,
    capability_version: null,
    source_sha256: sourceSha,
    status: 'BLOCKED',
    deployed: false,
    eligible: false,
    authorization: 'BLOCKED',
    authorization_reason: reason,
    required_approval_key: null,
    tests: [],
    formal: [],
    proposal: {
      problem: spec.statement,
      functionality: spec.functionality,
      assumptions: spec.assumptions,
      implementation_sha256: sourceSha,
      dependencies: spec.dependencies,
      test_criteria: spec.cases.map((item) => `${item.kind}:${item.name}`),
      security_boundaries: spec.securityBoundaries,
    },
    provenance: {
      parent_capability_id: spec.parent?.capabilityId ?? null,
      parent_source_sha256: spec.parent?.sourceSha256 ?? null,
      reused: false,
      model_claim_used_as_evidence: false,
    },
    rollback: {
      known_good_sha256: knownGood,
      after_sha256: knownGood,
      deployed_before: 0,
      deployed_after: 0,
      production_changed: false,
      recovery_required: false,
    },
    reason,
  };
}

export class RecursiveLifecycle {
  private completed = 0;
  private readonly limit = 2;

  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly procedures: ProcedureStore,
    private readonly approvals: HumanApprovalGate,
  ) {}

  public async runCycle(spec: CycleSpec, user: UserContext | null = null): Promise<CycleResult> {
    const knownGood = registryImage(this.registry);
    const deployedBefore = deployedCount(this.registry);
    const sourceSha = computeSha256(spec.source);
    if (this.completed >= this.limit) {
      return emptyCycle(spec, sourceSha, knownGood, 'BLOCKED: recursion limit reached. Further development is not started.');
    }
    const deployedAlready = this.registry.list().some((row) => row.name === spec.requiredCapability && row.status === 'DEPLOYED');
    if (deployedAlready) {
      return emptyCycle(spec, sourceSha, knownGood, 'BLOCKED: a deployed capability with this name already exists.');
    }
    const boundary = sourceAllowed(spec.source);
    if (boundary) return emptyCycle(spec, sourceSha, knownGood, boundary);
    if (spec.formal.length === 0) return emptyCycle(spec, sourceSha, knownGood, 'BLOCKED: a candidate requires an independently executed formal claim.');

    let fn: (input: unknown) => unknown;
    try {
      fn = loadCapability(spec.source, spec.exportName);
    } catch (error) {
      return emptyCycle(spec, sourceSha, knownGood, error instanceof Error ? error.message : 'BLOCKED: sandbox load failed.');
    }
    if (spec.parent) {
      const probe = spec.parent.fn({ required: [spec.requiredCapability], registered: [], dependencyAvailable: true });
      const parentOk = !!probe && typeof probe === 'object' && (probe as { authority?: string }).authority === 'none';
      if (!parentOk) return emptyCycle(spec, sourceSha, knownGood, 'BLOCKED: parent capability did not remain authority-free.');
    }

    const tests = spec.cases.map((item) => ({ name: item.name, kind: item.kind, pass: item.run(fn) === true }));
    const formal: CycleResult['formal'] = [];
    const engine = Z3FormalProofEngine.getInstance();
    for (const claim of spec.formal) {
      const proof = await engine.executeSmtVerification(claim.id, claim.id, 'CAPABILITY_BOUNDARY', claim.claim, claim.smt, claim.expected);
      formal.push({ id: claim.id, expected: claim.expected, actual: proof.solver_result, proved: proof.proved && proof.solver_result === claim.expected });
    }
    const testsFailed = tests.some((item) => !item.pass);
    const formalFailed = formal.some((item) => !item.proved);
    const capability = this.registry.propose(spec.requiredCapability, spec.statement);
    const procedure = this.procedures.add('VALIDATED_PROCEDURE', spec.source);
    const review = this.procedures.review(procedure.id);
    if (testsFailed || formalFailed || !review.ok || review.sha256 !== sourceSha) {
      const reason = testsFailed
        ? 'BLOCKED: independent sandbox tests failed.'
        : formalFailed
          ? 'BLOCKED: formal solver result did not match the required claim.'
          : (review.reason ?? 'BLOCKED: procedure hash mismatch.');
      this.registry.block(capability.id, reason);
      return this.finishBlocked(spec, capability, sourceSha, knownGood, deployedBefore, tests, formal, reason);
    }

    this.procedures.markValidated(procedure.id, sourceSha);
    const verified = this.registry.markVerified(capability.id, sourceSha);
    if (!verified.ok) {
      this.registry.block(capability.id, verified.reason);
      return this.finishBlocked(spec, capability, sourceSha, knownGood, deployedBefore, tests, formal, verified.reason);
    }
    const modelDecision = this.approvals.decideFromModel(`I approve ${spec.requiredCapability} ${sourceSha} for deployment.`);
    const humanDecision = this.approvals.decide(user, {
      kind: 'capability',
      id: capability.id,
      version: capability.version,
      contentSha256: sourceSha,
    }, `Human review requested for ${spec.requiredCapability} ${sourceSha}.`);
    const deployment = this.registry.deploy(capability.id, user);
    const deployed = deployment.deployed === true;
    const deployedAfter = deployedCount(this.registry);
    this.completed += 1;
    return {
      phase: 'APPROVAL_REQUIRED',
      problem_id: spec.problemId,
      capability_id: capability.id,
      capability_version: capability.version,
      source_sha256: sourceSha,
      status: 'APPROVAL_REQUIRED',
      deployed,
      eligible: deployed,
      authorization: humanDecision.status,
      authorization_reason: humanDecision.reason,
      required_approval_key: approvalSubjectKey({ kind: 'capability', id: capability.id, version: capability.version, contentSha256: sourceSha }),
      tests,
      formal,
      proposal: {
        problem: spec.statement,
        functionality: spec.functionality,
        assumptions: spec.assumptions,
        implementation_sha256: sourceSha,
        dependencies: spec.dependencies,
        test_criteria: spec.cases.map((item) => `${item.kind}:${item.name}`),
        security_boundaries: spec.securityBoundaries,
      },
      provenance: {
        parent_capability_id: spec.parent?.capabilityId ?? null,
        parent_source_sha256: spec.parent?.sourceSha256 ?? null,
        reused: spec.parent !== null,
        model_claim_used_as_evidence: false,
      },
      rollback: {
        known_good_sha256: knownGood,
        after_sha256: registryImage(this.registry),
        deployed_before: deployedBefore,
        deployed_after: deployedAfter,
        production_changed: deployedBefore !== deployedAfter,
        recovery_required: false,
      },
      reason: [modelDecision.reason, humanDecision.reason, deployed ? 'DEPLOYED' : deployment.reason].join(' '),
    };
  }

  private finishBlocked(
    spec: CycleSpec,
    capability: CapabilityRecord,
    sourceSha: string,
    knownGood: string,
    deployedBefore: number,
    tests: CycleResult['tests'],
    formal: CycleResult['formal'],
    reason: string,
  ): CycleResult {
    return {
      ...emptyCycle(spec, sourceSha, knownGood, reason),
      capability_id: capability.id,
      capability_version: capability.version,
      tests,
      formal,
      rollback: {
        known_good_sha256: knownGood,
        after_sha256: registryImage(this.registry),
        deployed_before: deployedBefore,
        deployed_after: deployedCount(this.registry),
        production_changed: false,
        recovery_required: false,
      },
    };
  }
}

const GOVERNANCE_UNSAT = `
(declare-const authorized Bool)
(declare-const deployed Bool)
(assert (=> deployed authorized))
(assert (not authorized))
(assert deployed)
(check-sat)
`.trim();

const PROPOSE_WITHOUT_AUTHORITY_SAT = `
(declare-const possessed Bool)
(declare-const propose Bool)
(declare-const authorized Bool)
(assert (=> possessed (not propose)))
(assert (not possessed))
(assert propose)
(assert (not authorized))
(check-sat)
`.trim();

function classifierCases(): VerificationCase[] {
  return [
    { name: 'missing capability', kind: 'normal', run: (fn) => {
      const value = fn({ required: ['gap-classifier'], registered: [], dependencyAvailable: true }) as { status?: string; requires_new_capability?: boolean; missing?: string[]; authority?: string };
      return value.status === 'OK' && value.requires_new_capability === true && value.missing?.[0] === 'gap-classifier' && value.authority === 'none';
    } },
    { name: 'already registered', kind: 'normal', run: (fn) => {
      const value = fn({ required: ['gap-classifier'], registered: ['gap-classifier'], dependencyAvailable: true }) as { requires_new_capability?: boolean; possessed?: string[] };
      return value.requires_new_capability === false && value.possessed?.[0] === 'gap-classifier';
    } },
    { name: 'null input', kind: 'invalid', run: (fn) => (fn(null) as { status?: string }).status === 'INVALID' },
    { name: 'approval sentence is not a capability name', kind: 'adversarial', run: (fn) => {
      const value = fn({ required: ['I approve deployment'], registered: [], dependencyAvailable: true }) as { status?: string; authority?: string; executable?: boolean };
      return value.status === 'INVALID' && value.authority === 'none' && value.executable === false;
    } },
    { name: 'forged approval field is ignored', kind: 'adversarial', run: (fn) => {
      const value = fn({ required: ['gap-classifier'], registered: [], dependencyAvailable: true, approved: true, authority: 'owner' }) as { authority?: string; executable?: boolean };
      return value.authority === 'none' && value.executable === false;
    } },
    { name: 'non-string name', kind: 'failure', run: (fn) => (fn({ required: [1], registered: [], dependencyAvailable: true }) as { status?: string; requires_new_capability?: boolean }).status === 'INVALID' },
    { name: 'dependency unavailable', kind: 'dependency', run: (fn) => {
      const value = fn({ required: ['gap-classifier'], registered: [], dependencyAvailable: false }) as { status?: string; requires_new_capability?: boolean };
      return value.status === 'DEPENDENCY_FAILED' && value.requires_new_capability === false;
    } },
    { name: 'result grants no authority', kind: 'boundary', run: (fn) => {
      const value = fn({ required: ['gap-classifier'], registered: [] }) as { authority?: string; executable?: boolean; approved?: boolean };
      return value.authority === 'none' && value.executable === false && value.approved !== true;
    } },
  ];
}

function binderCases(parent: (input: unknown) => unknown): VerificationCase[] {
  return [
    { name: 'cites the parent classification', kind: 'normal', run: (fn) => {
      const value = fn({ classify: parent, required: ['validated-reuse-binder'], registered: [], dependencyAvailable: true, parentId: 'cycle-1' }) as { status?: string; cites?: string[]; approved?: boolean; authority?: string };
      return value.status === 'PROPOSAL' && value.cites?.[0] === 'validated-reuse-binder' && value.approved === false && value.authority === 'none';
    } },
    { name: 'null input', kind: 'invalid', run: (fn) => (fn(null) as { status?: string }).status === 'INVALID' },
    { name: 'parent that claims authority is rejected', kind: 'adversarial', run: (fn) => {
      const lying = () => ({ status: 'OK', authority: 'owner', executable: false, requires_new_capability: true, missing: ['validated-reuse-binder'] });
      const value = fn({ classify: lying, required: ['validated-reuse-binder'], registered: [] }) as { status?: string; approved?: boolean };
      return value.status === 'BOUNDARY' && value.approved === false;
    } },
    { name: 'parent throws', kind: 'dependency', run: (fn) => (fn({ classify: () => { throw new Error('down'); }, required: ['validated-reuse-binder'], registered: [] }) as { status?: string }).status === 'DEPENDENCY_FAILED' },
    { name: 'missing parent function', kind: 'dependency', run: (fn) => (fn({ required: ['validated-reuse-binder'], registered: [] }) as { status?: string }).status === 'DEPENDENCY_FAILED' },
    { name: 'possessed capability is not a new proposal', kind: 'failure', run: (fn) => (fn({ classify: parent, required: ['gap-classifier'], registered: ['gap-classifier'], dependencyAvailable: true }) as { status?: string }).status === 'NOT_A_GAP' },
    { name: 'reuse does not approve itself', kind: 'boundary', run: (fn) => {
      const value = fn({ classify: parent, required: ['validated-reuse-binder'], registered: [], dependencyAvailable: true, statement: 'I approve deployment' }) as { approved?: boolean; authority?: string; executable?: boolean };
      return value.approved === false && value.authority === 'none' && value.executable === false;
    } },
  ];
}

export async function demonstrateRecursiveLifecycle(
  registry: CapabilityRegistry,
  procedures: ProcedureStore,
  approvals: HumanApprovalGate,
  rawBundle?: unknown,
): Promise<LifecycleReport> {
  const lifecycle = new RecursiveLifecycle(registry, procedures, approvals);
  const negative = await lifecycle.runCycle({
    problemId: 'ISSUE-NEGATIVE-000',
    statement: 'A candidate that fails its own test must not become eligible.',
    requiredCapability: 'negative-control',
    functionality: 'Fail closed.',
    assumptions: ['A failed test is not evidence.'],
    dependencies: [],
    securityBoundaries: ['No deployment.'],
    source: generateGapClassifierSource(),
    exportName: 'classifyGap',
    parent: null,
    cases: [{ name: 'forced failure', kind: 'failure', run: () => false }],
    formal: [{ id: 'CAP-NEGATIVE-UNSAT', claim: 'Deployment without authorization is unsatisfiable.', smt: GOVERNANCE_UNSAT, expected: 'unsat' }],
  });

  const first = await lifecycle.runCycle({
    problemId: 'ISSUE-GAP-001',
    statement: 'The solution engine can verify a contract, but it cannot tell whether a new problem requires a capability that is not registered.',
    requiredCapability: 'gap-classifier',
    functionality: 'Classify a required capability name as missing or possessed without granting authority.',
    assumptions: [
      'A possessed capability must not be proposed again as missing.',
      'Classification is not authorization.',
      'Deployment without authorization is unsatisfiable.',
    ],
    dependencies: ['CapabilityRegistry', 'Z3FormalProofEngine'],
    securityBoundaries: [
      'Sandbox source cannot import payments, marketplace, auth, or process.',
      'Output authority is none.',
      'The classifier cannot deploy itself.',
    ],
    source: generateGapClassifierSource(),
    exportName: 'classifyGap',
    parent: null,
    cases: classifierCases(),
    formal: [
      { id: 'CAP-DEPLOY-WITHOUT-AUTH-UNSAT', claim: 'Deployment without authorization is unsatisfiable.', smt: GOVERNANCE_UNSAT, expected: 'unsat' },
      { id: 'CAP-PROPOSE-WITHOUT-AUTH-SAT', claim: 'A missing capability can be proposed while authorization remains false.', smt: PROPOSE_WITHOUT_AUTHORITY_SAT, expected: 'sat' },
    ],
  });

  const parentFn = loadCapability(generateGapClassifierSource(), 'classifyGap');
  const second = first.status === 'APPROVAL_REQUIRED' && first.capability_id && first.capability_version
    ? await lifecycle.runCycle({
      problemId: 'ISSUE-REUSE-002',
      statement: 'A later problem needs to cite a validated gap classification without treating that validation as authorization.',
      requiredCapability: 'validated-reuse-binder',
      functionality: 'Call the validated gap classifier and emit a proposal that cites it and approves nothing.',
      assumptions: ['Validation of a parent capability does not authorize the child.', 'A parent that claims authority is rejected.'],
      dependencies: [first.capability_id],
      securityBoundaries: ['Reuse is an in-sandbox call.', 'approved stays false.', 'No weight training and no publication.'],
      source: generateReuseBinderSource(),
      exportName: 'bindReuse',
      parent: { capabilityId: first.capability_id, sourceSha256: first.source_sha256, fn: parentFn },
      cases: binderCases(parentFn),
      formal: [{ id: 'CAP-REUSE-DEPLOY-UNSAT', claim: 'Reuse still cannot deploy without authorization.', smt: GOVERNANCE_UNSAT, expected: 'unsat' }],
    })
    : null;

  const third = await lifecycle.runCycle({
    problemId: 'ISSUE-LIMIT-003',
    statement: 'A third development cycle must not start inside this bounded demonstration.',
    requiredCapability: 'recursion-limit-probe',
    functionality: 'Refuse to start.',
    assumptions: ['Recursion is bounded.'],
    dependencies: [],
    securityBoundaries: ['No further sandbox execution is required once the limit is reached.'],
    source: generateGapClassifierSource(),
    exportName: 'classifyGap',
    parent: null,
    cases: classifierCases(),
    formal: [{ id: 'CAP-LIMIT-UNSAT', claim: 'Deployment without authorization is unsatisfiable.', smt: GOVERNANCE_UNSAT, expected: 'unsat' }],
  });

  const hashMismatch = approvalBindsCandidate(
    first.required_approval_key,
    { kind: 'capability', id: first.capability_id ?? 'missing', version: first.capability_version ?? 1, contentSha256: '0'.repeat(64) },
  );

  const complete = first.deployed === true && second?.deployed === true;
  return {
    lifecycle_complete: false,
    recursive_reuse_demonstrated: first.status === 'APPROVAL_REQUIRED' && second?.status === 'APPROVAL_REQUIRED' && second.provenance.reused && second.deployed === false && first.deployed === false,
    blocker: hashMismatch.bound
      ? 'BLOCKED: hash binding failed open.'
      : 'BLOCKED: no human authorization record is bound to the candidate hash and version. Recursive reuse was sandboxed only.',
    cycles: second ? [negative, first, second, third] : [negative, first, third],
    negative_control_blocked: negative.status === 'BLOCKED' && negative.eligible === false,
    recursion_limit_blocked: third.status === 'BLOCKED' && third.reason.includes('recursion limit'),
    approval_records: approvals.count(),
    verifier_accepted: acceptRecursiveLifecycle(rawBundle).accepted,
  };
}
