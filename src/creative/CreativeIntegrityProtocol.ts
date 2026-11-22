/**
 * Daisy Creative Integrity Protocol (CICAP).
 *
 * This is a deterministic policy boundary, not a content-understanding model.
 * Relevance, appropriateness, safety, and evidence assessments must come from
 * configured trusted reviewers. Missing/unknown assessments never silently pass.
 */

export type CreativityMode =
  | 'GENERATIVE'
  | 'EXPLORATORY'
  | 'ANALYTICAL'
  | 'SYNTHETIC'
  | 'SIMULATIVE'
  | 'EXECUTABLE';

export type EvidenceLabel =
  | 'VERIFIED'
  | 'PROPOSED'
  | 'HYPOTHESIS'
  | 'SIMULATED'
  | 'UNVERIFIED';

export type PolicyAssessment = 'PASS' | 'FAIL' | 'UNKNOWN';
export type CreativeDecision = 'ALLOW' | 'REVIEW_REQUIRED' | 'BLOCKED';

export interface CreativeEvidenceReference {
  kind: 'SOURCE' | 'TEST' | 'EXECUTION' | 'DEPLOYMENT' | 'HUMAN_REVIEW';
  id: string;
  uri?: string;
}

export interface CreativeIntegrityRequest {
  task: string;
  output: string;
  mode: CreativityMode;
  evidenceLabel: EvidenceLabel;
  audience: string;
  domain: string;
  assessments: {
    taskRelevance: PolicyAssessment;
    contextualAppropriateness: PolicyAssessment;
    safety: PolicyAssessment;
    evidenceIntegrity: PolicyAssessment;
  };
  evidence?: CreativeEvidenceReference[];
  simulationDeclared?: boolean;
  claimsActualExecution?: boolean;
  executionAuthorized?: boolean;
}

export interface CreativeIntegrityResult {
  protocol: 'CICAP';
  version: '1.0.0';
  decision: CreativeDecision;
  evidenceLabel: EvidenceLabel;
  reasons: string[];
}

const isNonBlank = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const ASSESSMENT_KEYS = [
  'taskRelevance',
  'contextualAppropriateness',
  'safety',
  'evidenceIntegrity',
] as const;

export function evaluateCreativeIntegrity(
  request: CreativeIntegrityRequest,
): CreativeIntegrityResult {
  const reasons: string[] = [];
  const block = (reason: string): CreativeIntegrityResult => ({
    protocol: 'CICAP',
    version: '1.0.0',
    decision: 'BLOCKED',
    evidenceLabel: request?.evidenceLabel ?? 'UNVERIFIED',
    reasons: [...reasons, reason],
  });

  if (!request || !isNonBlank(request.task) || !isNonBlank(request.output)) {
    return block('A concrete task and non-empty output are required.');
  }
  if (!isNonBlank(request.audience) || !isNonBlank(request.domain)) {
    return block('Audience and domain context are required.');
  }

  const evidence = Array.isArray(request.evidence) ? request.evidence : [];
  if (request.mode === 'EXECUTABLE' && request.executionAuthorized !== true) {
    return block('Executable work requires explicit authorization.');
  }
  if (request.evidenceLabel === 'VERIFIED') {
    if (request.assessments?.evidenceIntegrity !== 'PASS' || evidence.length === 0) {
      return block('VERIFIED output requires a passing evidence-integrity assessment and evidence references.');
    }
  }
  if (request.evidenceLabel === 'SIMULATED') {
    if (request.simulationDeclared !== true || request.claimsActualExecution === true) {
      return block('SIMULATED output must be explicitly declared and cannot claim real execution.');
    }
  }
  if (request.claimsActualExecution === true &&
      !evidence.some((item) => item.kind === 'EXECUTION' || item.kind === 'DEPLOYMENT' || item.kind === 'TEST')) {
    return block('Claims of execution, testing, or deployment require matching evidence references.');
  }

  for (const key of ASSESSMENT_KEYS) {
    const assessment = request.assessments?.[key] ?? 'UNKNOWN';
    if (assessment === 'FAIL') {
      return block(`The ${key} assessment failed.`);
    }
    if (assessment !== 'PASS') {
      reasons.push(`${key} has not been positively established.`);
    }
  }

  if (reasons.length > 0) {
    return {
      protocol: 'CICAP',
      version: '1.0.0',
      decision: 'REVIEW_REQUIRED',
      evidenceLabel: request.evidenceLabel,
      reasons,
    };
  }

  return {
    protocol: 'CICAP',
    version: '1.0.0',
    decision: 'ALLOW',
    evidenceLabel: request.evidenceLabel,
    reasons: ['Task relevance, contextual appropriateness, safety, and evidence integrity were positively assessed.'],
  };
}
